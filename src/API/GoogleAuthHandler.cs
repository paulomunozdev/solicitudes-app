using Google.Apis.Auth;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace API;

/// <summary>
/// Esquema de autenticación personalizado para tokens Google Identity Services (JWT).
/// Valida el credential, provisiona usuario/tenant en el tenant fijo de la app,
/// y agrega claims unificados (userId, tenantId, rol, unidadNegocio).
/// </summary>
public class GoogleAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory loggerFactory,
    UrlEncoder encoder,
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, loggerFactory, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // SignalR WebSocket pasa el token como query param en vez del header Authorization
        string token;
        var authHeader = Request.Headers.Authorization.ToString();
        if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            token = authHeader["Bearer ".Length..].Trim();
        }
        else if (Request.Query.TryGetValue("access_token", out var qt) && !string.IsNullOrEmpty(qt))
        {
            // Solo permitir para rutas de SignalR
            var path = Request.Path;
            if (!path.StartsWithSegments("/hubs"))
                return AuthenticateResult.NoResult();
            token = qt!;
        }
        else
        {
            return AuthenticateResult.NoResult();
        }

        GoogleJsonWebSignature.Payload payload;
        try
        {
            var googleClientId = configuration["Google:ClientId"]!;
            payload = await GoogleJsonWebSignature.ValidateAsync(token,
                new GoogleJsonWebSignature.ValidationSettings
                {
                    Audience = [googleClientId],
                });
        }
        catch
        {
            return AuthenticateResult.NoResult(); // No es un token de Google válido
        }

        // Tenant fijo de la aplicación (single-tenant)
        var tenantId = Guid.Parse(configuration["App:TenantId"]!);

        var email  = payload.Email ?? string.Empty;
        var nombre = payload.Name  ?? email;

        // userId inicial (puede ser nuevo o existente — ProvisionAsync devuelve el Id real)
        var userId = DeterministicGuid(payload.Subject);
        var (actualUserId, rol, unidadNombre) = await ProvisionAsync(userId, tenantId, payload.Subject, email, nombre);

        var claims = new[]
        {
            new Claim("userId",         actualUserId.ToString()),
            new Claim("tenantId",       tenantId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(ClaimTypes.Name,  nombre),
            new Claim("rol",            ((int)rol).ToString()),
            new Claim("unidadNegocio",  unidadNombre ?? string.Empty),
        };

        var identity  = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket    = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }

    private async Task<(Guid UserId, Domain.Enums.RolUsuario Rol, string? UnidadNombre)> ProvisionAsync(
        Guid userId, Guid tenantId, string googleSub, string email, string nombre)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // ── Upsert Tenant ────────────────────────────────────────
        var tenant = await db.Tenants.FindAsync(tenantId);
        if (tenant is null)
        {
            var domain = email.Split('@').LastOrDefault()?.ToLowerInvariant() ?? "app";
            tenant = new Domain.Entities.Tenant { Id = tenantId, Nombre = domain, Plan = "Basic", Activo = true };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
            await Infrastructure.Persistence.SlaProvisioner.ProvisionarAsync(db, tenantId);
        }

        // ── Upsert Usuario (buscar por Email para evitar duplicados) ─
        var usuario = await db.Usuarios.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Email == email);

        if (usuario is null)
        {
            var esAdmin = !await db.Usuarios.IgnoreQueryFilters()
                .AnyAsync(u => u.TenantId == tenantId);

            usuario = new Domain.Entities.Usuario
            {
                Id           = userId,
                TenantId     = tenantId,
                ExternalId   = googleSub,
                Email        = email,
                Nombre       = nombre,
                Rol          = esAdmin ? Domain.Enums.RolUsuario.Admin : Domain.Enums.RolUsuario.Solicitante,
                Activo       = true,
                UltimoAcceso = DateTime.UtcNow,
            };
            db.Usuarios.Add(usuario);
        }
        else
        {
            usuario.Nombre       = nombre;
            usuario.UltimoAcceso = DateTime.UtcNow;
            db.Usuarios.Update(usuario);
        }

        await db.SaveChangesAsync();
        return (usuario.Id, usuario.Rol, usuario.UnidadNegocioNombre);
    }

    /// <summary>
    /// Genera un GUID deterministico a partir del sub de Google (compatible con versiones anteriores).
    /// </summary>
    private static Guid DeterministicGuid(string input)
    {
        using var md5 = System.Security.Cryptography.MD5.Create();
        var hash = md5.ComputeHash(System.Text.Encoding.UTF8.GetBytes(input));
        return new Guid(hash);
    }
}

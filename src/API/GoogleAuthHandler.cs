using Domain.Entities;
using Domain.Enums;
using Google.Apis.Auth;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;

namespace API;

/// <summary>
/// Valida Google ID Tokens, provisiona Tenant/Usuario si es la primera vez,
/// y agrega claims de rol y unidad de negocio.
/// </summary>
public class GoogleAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration,
    IServiceScopeFactory scopeFactory)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.Fail("No Bearer token");

        var idToken = authHeader["Bearer ".Length..].Trim();

        try
        {
            var clientId = configuration["Google:ClientId"]!;
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });

            var userId   = DeterministicGuid(payload.Subject);
            var domain   = payload.Email.Split('@').Last().ToLowerInvariant();
            var tenantId = DeterministicGuid(domain);

            // Provisionar tenant y usuario en BD
            var rol             = RolUsuario.Solicitante;
            string? unidadNombre = null;

            try
            {
                (rol, unidadNombre) = await ProvisionAsync(
                    userId, tenantId, domain,
                    payload.Subject, payload.Email, payload.Name, payload.Picture);
            }
            catch (Exception ex)
            {
                Logger.LogError(ex, "Error provisionando usuario {Email}", payload.Email);
                // No bloqueamos el login; el usuario tendrá rol Solicitante por defecto
            }

            var claims = new[]
            {
                new Claim("userId",         userId.ToString()),
                new Claim("tenantId",       tenantId.ToString()),
                new Claim(ClaimTypes.Email, payload.Email),
                new Claim(ClaimTypes.Name,  payload.Name),
                new Claim("picture",        payload.Picture ?? string.Empty),
                new Claim("rol",            ((int)rol).ToString()),
                new Claim("unidadNegocio",  unidadNombre ?? string.Empty),
            };

            var identity = new ClaimsIdentity(claims, "Google");
            return AuthenticateResult.Success(
                new AuthenticationTicket(new ClaimsPrincipal(identity), "Google"));
        }
        catch (Exception ex)
        {
            return AuthenticateResult.Fail($"Invalid Google token: {ex.Message}");
        }
    }

    private async Task<(RolUsuario Rol, string? UnidadNombre)> ProvisionAsync(
        Guid userId, Guid tenantId, string domain,
        string externalId, string email, string nombre, string? foto)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // ── Upsert Tenant ────────────────────────────────────────────
        var tenant = await db.Tenants.FindAsync(tenantId);
        if (tenant is null)
        {
            tenant = new Tenant { Id = tenantId, Nombre = domain, Plan = "Basic", Activo = true };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
        }

        // ── Upsert Usuario ───────────────────────────────────────────
        var usuario = await db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.ExternalId == externalId);

        if (usuario is null)
        {
            // Primer usuario del tenant → Admin; resto → Solicitante
            var esAdmin = !await db.Usuarios
                .IgnoreQueryFilters()
                .AnyAsync(u => u.TenantId == tenantId);

            usuario = new Usuario
            {
                Id           = userId,
                TenantId     = tenantId,
                ExternalId   = externalId,
                Email        = email,
                Nombre       = nombre,
                Foto         = foto,
                Rol          = esAdmin ? RolUsuario.Admin : RolUsuario.Solicitante,
                Activo       = true,
                UltimoAcceso = DateTime.UtcNow,
            };
            db.Usuarios.Add(usuario);
        }
        else
        {
            usuario.Nombre       = nombre;
            usuario.Foto         = foto;
            usuario.UltimoAcceso = DateTime.UtcNow;
            db.Usuarios.Update(usuario);
        }

        await db.SaveChangesAsync();
        return (usuario.Rol, usuario.UnidadNegocioNombre);
    }

    /// <summary>Genera un Guid determinístico a partir de un string usando SHA-256.</summary>
    private static Guid DeterministicGuid(string input)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return new Guid(hash[..16]);
    }
}

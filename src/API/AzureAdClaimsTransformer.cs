using Domain.Entities;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace API;

/// <summary>
/// Enriquece el principal de Azure AD con datos del tenant fijo de la app:
/// provisiona usuario/tenant si es la primera vez y agrega claims de rol y BU.
/// </summary>
public class AzureAdClaimsTransformer(
    IServiceScopeFactory scopeFactory,
    ILogger<AzureAdClaimsTransformer> logger,
    IConfiguration configuration)
{
    public async Task EnrichAsync(ClaimsPrincipal principal)
    {
        var oidStr = principal.FindFirst("oid")?.Value;

        if (!Guid.TryParse(oidStr, out var userId))
            return;

        // Tenant fijo de la aplicación (single-tenant) — ignorar tid del token
        var tenantId = Guid.Parse(configuration["App:TenantId"]!);

        var email  = principal.FindFirst("preferred_username")?.Value
                  ?? principal.FindFirst("upn")?.Value
                  ?? principal.FindFirst("email")?.Value
                  ?? string.Empty;
        var nombre = principal.FindFirst("name")?.Value ?? email;

        var rol            = RolUsuario.Solicitante;
        string? unidadNombre = null;

        try
        {
            (rol, unidadNombre) = await ProvisionAsync(userId, tenantId, email, nombre);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Error provisionando usuario Azure AD {Email}", email);
            try
            {
                using var fbScope = scopeFactory.CreateScope();
                var fbDb = fbScope.ServiceProvider.GetRequiredService<AppDbContext>();
                var fbUser = await fbDb.Usuarios.IgnoreQueryFilters()
                    .FirstOrDefaultAsync(u => u.Id == userId);
                if (fbUser is not null) { rol = fbUser.Rol; unidadNombre = fbUser.UnidadNegocioNombre; }
            }
            catch { }
        }

        var identity = new ClaimsIdentity();
        identity.AddClaim(new Claim("userId",        userId.ToString()));
        identity.AddClaim(new Claim("tenantId",      tenantId.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Email, email));
        identity.AddClaim(new Claim(ClaimTypes.Name,  nombre));
        identity.AddClaim(new Claim("rol",            ((int)rol).ToString()));
        identity.AddClaim(new Claim("unidadNegocio",  unidadNombre ?? string.Empty));

        principal.AddIdentity(identity);
    }

    private async Task<(RolUsuario Rol, string? UnidadNombre)> ProvisionAsync(
        Guid userId, Guid tenantId, string email, string nombre)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // ── Upsert Tenant ────────────────────────────────────────
        var tenant = await db.Tenants.FindAsync(tenantId);
        if (tenant is null)
        {
            var domain = email.Split('@').LastOrDefault()?.ToLowerInvariant() ?? "unknown";
            tenant = new Tenant { Id = tenantId, Nombre = domain, Plan = "Basic", Activo = true };
            db.Tenants.Add(tenant);
            await db.SaveChangesAsync();
            await Infrastructure.Persistence.SlaProvisioner.ProvisionarAsync(db, tenantId);
        }

        // ── Upsert Usuario ───────────────────────────────────────
        var usuario = await db.Usuarios.IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId);

        if (usuario is null)
        {
            var esAdmin = !await db.Usuarios.IgnoreQueryFilters()
                .AnyAsync(u => u.TenantId == tenantId);

            usuario = new Usuario
            {
                Id         = userId,
                TenantId   = tenantId,
                ExternalId = userId.ToString(),
                Email      = email,
                Nombre     = nombre,
                Rol        = esAdmin ? RolUsuario.Admin : RolUsuario.Solicitante,
                Activo     = true,
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
        return (usuario.Rol, usuario.UnidadNegocioNombre);
    }
}

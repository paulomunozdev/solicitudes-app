using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Enums;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class UsuariosController(AppDbContext db, ICurrentUserService currentUser) : ControllerBase
{
    [AllowAnonymous]
    [HttpGet("ping")]
    public IActionResult Ping() => Ok("pong");

    /// <summary>Perfil del usuario autenticado. Auto-provisiona si no existe en BD.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var usuario = await db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct);

        if (usuario is null)
        {
            // Garantizar que el tenant existe antes de insertar el usuario
            var tenant = await db.Tenants.FindAsync([currentUser.TenantId], ct);
            if (tenant is null)
            {
                var domain = currentUser.Email.Split('@').Last().ToLowerInvariant();
                tenant = new Domain.Entities.Tenant
                {
                    Id = currentUser.TenantId,
                    Nombre = domain,
                    Plan = "Basic",
                    Activo = true
                };
                db.Tenants.Add(tenant);
                await db.SaveChangesAsync(ct);
                await Infrastructure.Persistence.SlaProvisioner.ProvisionarAsync(db, currentUser.TenantId, ct);
            }

            // Primer usuario del tenant → Admin
            var esAdmin = !await db.Usuarios
                .IgnoreQueryFilters()
                .AnyAsync(u => u.TenantId == currentUser.TenantId, ct);

            usuario = new Domain.Entities.Usuario
            {
                Id           = currentUser.UserId,
                TenantId     = currentUser.TenantId,
                ExternalId   = string.Empty,
                Email        = currentUser.Email,
                Nombre       = currentUser.UserName,
                Rol          = esAdmin ? RolUsuario.Admin : RolUsuario.Solicitante,
                Activo       = true,
                UltimoAcceso = DateTime.UtcNow,
            };
            db.Usuarios.Add(usuario);
            await db.SaveChangesAsync(ct);
        }

        return Ok(new UsuarioDto(
            usuario.Id, usuario.TenantId, usuario.Nombre, usuario.Email, usuario.Foto,
            (int)usuario.Rol, usuario.Rol.ToString(),
            usuario.UnidadNegocioNombre, usuario.Activo, usuario.UltimoAcceso));
    }

    /// <summary>Lista usuarios del tenant. Admin ve todos; Gestor puede filtrar por BU.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? bu, CancellationToken ct)
    {
        if (currentUser.Rol != RolUsuario.Admin && currentUser.Rol != RolUsuario.Gestor)
            return Forbid();

        var query = db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == currentUser.TenantId);

        if (!string.IsNullOrWhiteSpace(bu))
            query = query.Where(u => u.UnidadNegocioNombre == bu);

        var usuarios = await query.OrderBy(u => u.Nombre).ToListAsync(ct);

        var dtos = usuarios.Select(u => new UsuarioDto(
            u.Id, u.TenantId, u.Nombre, u.Email, u.Foto,
            (int)u.Rol, u.Rol.ToString(),
            u.UnidadNegocioNombre, u.Activo, u.UltimoAcceso));

        return Ok(dtos);
    }

    /// <summary>Actualiza rol y unidad de negocio de un usuario (solo Admin).</summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ActualizarUsuarioRequest req, CancellationToken ct)
    {
        if (currentUser.Rol != RolUsuario.Admin) return Forbid();

        var usuario = await db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == id && u.TenantId == currentUser.TenantId, ct);

        if (usuario is null) return NotFound();

        if (!Enum.IsDefined(typeof(RolUsuario), req.Rol)) return BadRequest("Rol inválido");

        usuario.Rol                 = (RolUsuario)req.Rol;
        usuario.UnidadNegocioNombre = req.UnidadNegocioNombre;
        usuario.ActualizadoEn       = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return NoContent();
    }
}

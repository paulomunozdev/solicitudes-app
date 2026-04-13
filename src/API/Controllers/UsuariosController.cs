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
    /// <summary>Perfil del usuario autenticado.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var usuario = await db.Usuarios
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == currentUser.UserId, ct);

        if (usuario is null) return NotFound();

        return Ok(new UsuarioDto(
            usuario.Id, usuario.Nombre, usuario.Email, usuario.Foto,
            (int)usuario.Rol, usuario.Rol.ToString(),
            usuario.UnidadNegocioNombre, usuario.Activo, usuario.UltimoAcceso));
    }

    /// <summary>Lista todos los usuarios del tenant (solo Admin).</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        if (currentUser.Rol != RolUsuario.Admin) return Forbid();

        var usuarios = await db.Usuarios
            .IgnoreQueryFilters()
            .Where(u => u.TenantId == currentUser.TenantId)
            .OrderBy(u => u.Nombre)
            .ToListAsync(ct);

        var dtos = usuarios.Select(u => new UsuarioDto(
            u.Id, u.Nombre, u.Email, u.Foto,
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

using Application.Common.Interfaces;
using Domain.Entities;

namespace Infrastructure.Persistence;

public class AuditoriaService(AppDbContext db) : IAuditoriaService
{
    public async Task RegistrarAsync(
        Guid tenantId,
        string entidadTipo,
        Guid entidadId,
        string accion,
        Guid usuarioId,
        string usuarioNombre,
        string? detalle = null,
        CancellationToken ct = default)
    {
        var entry = new AuditoriaEntry
        {
            TenantId      = tenantId,
            EntidadTipo   = entidadTipo,
            EntidadId     = entidadId,
            Accion        = accion,
            UsuarioId     = usuarioId,
            UsuarioNombre = usuarioNombre,
            Detalle       = detalle,
        };

        await db.Auditoria.AddAsync(entry, ct);
        await db.SaveChangesAsync(ct);
    }
}

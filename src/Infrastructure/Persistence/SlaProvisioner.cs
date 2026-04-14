using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

/// <summary>
/// Inserta los registros SlaConfig por defecto para un tenant nuevo.
/// Se llama una sola vez al crear el tenant; si ya existen no hace nada.
/// </summary>
public static class SlaProvisioner
{
    /// <summary>
    /// Valores por defecto:
    /// Crítica = 4 h | Alta = 24 h | Media = 72 h | Baja = 168 h (7 días)
    /// </summary>
    private static readonly (PrioridadSolicitud Prioridad, int Horas)[] Defaults =
    [
        (PrioridadSolicitud.Critica, 4),
        (PrioridadSolicitud.Alta,    24),
        (PrioridadSolicitud.Media,   72),
        (PrioridadSolicitud.Baja,    168),
    ];

    public static async Task ProvisionarAsync(AppDbContext db, Guid tenantId, CancellationToken ct = default)
    {
        var yaExiste = await db.SlaConfigs
            .IgnoreQueryFilters()
            .AnyAsync(s => s.TenantId == tenantId, ct);

        if (yaExiste) return;

        foreach (var (prioridad, horas) in Defaults)
        {
            db.SlaConfigs.Add(new SlaConfig
            {
                TenantId  = tenantId,
                Prioridad = prioridad,
                Horas     = horas,
            });
        }

        await db.SaveChangesAsync(ct);
    }
}

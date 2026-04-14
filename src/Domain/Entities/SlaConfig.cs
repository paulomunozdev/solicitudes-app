using Domain.Enums;

namespace Domain.Entities;

/// <summary>
/// Configuración de SLA por prioridad para un tenant.
/// Define cuántas horas tiene el equipo para resolver una solicitud según su prioridad.
/// </summary>
public class SlaConfig : TenantEntity
{
    public PrioridadSolicitud Prioridad { get; set; }

    /// <summary>Horas hábiles máximas para resolver la solicitud.</summary>
    public int Horas { get; set; }
}

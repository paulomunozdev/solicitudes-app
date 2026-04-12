namespace Domain.Interfaces;

/// <summary>Abstracción para notificaciones en tiempo real (SignalR).</summary>
public interface IRealtimeNotifier
{
    Task NotificarSolicitudCreadaAsync(Guid tenantId, Guid solicitudId, string titulo, CancellationToken ct = default);
    Task NotificarEstadoCambiadoAsync(Guid tenantId, Guid solicitudId, int estadoAnterior, int nuevoEstado, CancellationToken ct = default);
    Task NotificarComentarioAgregadoAsync(Guid tenantId, Guid solicitudId, string usuarioNombre, string texto, CancellationToken ct = default);
}

using Domain.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Infrastructure.Realtime;

/// <summary>Hub vacío en Infrastructure para evitar dependencia circular con API.</summary>
public class SolicitudesHub : Hub
{
    public async Task UnirseATenant(string tenantId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
}

public class SignalRNotifier(IHubContext<SolicitudesHub> hub) : IRealtimeNotifier
{
    public async Task NotificarSolicitudCreadaAsync(Guid tenantId, Guid solicitudId, string titulo, CancellationToken ct = default) =>
        await hub.Clients.Group($"tenant-{tenantId}")
            .SendAsync("SolicitudCreada", new { solicitudId, titulo }, ct);

    public async Task NotificarEstadoCambiadoAsync(Guid tenantId, Guid solicitudId, int estadoAnterior, int nuevoEstado, CancellationToken ct = default) =>
        await hub.Clients.Group($"tenant-{tenantId}")
            .SendAsync("EstadoCambiado", new { solicitudId, tenantId, estadoAnterior, nuevoEstado }, ct);

    public async Task NotificarComentarioAgregadoAsync(Guid tenantId, Guid solicitudId, string usuarioNombre, string texto, CancellationToken ct = default) =>
        await hub.Clients.Group($"tenant-{tenantId}")
            .SendAsync("ComentarioAgregado", new { solicitudId, usuarioNombre, texto }, ct);
}

using Domain.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;

namespace Infrastructure.Realtime;

/// <summary>
/// Hub de tiempo real para notificaciones de solicitudes.
/// Está en Infrastructure para que SignalRNotifier pueda inyectar IHubContext sin dependencia circular con API.
/// </summary>
[Authorize]
public class SolicitudesHub : Hub
{
    /// <summary>
    /// El cliente se une al grupo de su tenant.
    /// Se valida que el tenantId solicitado coincida con el claim del token.
    /// </summary>
    public async Task UnirseATenant(string tenantId)
    {
        var userTenantId = Context.User?.FindFirst("tenantId")?.Value;

        if (string.IsNullOrEmpty(userTenantId) || userTenantId != tenantId)
            throw new HubException("No tienes permiso para suscribirte a este tenant.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
    }
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

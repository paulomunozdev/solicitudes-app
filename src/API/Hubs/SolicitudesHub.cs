using Microsoft.AspNetCore.SignalR;

namespace API.Hubs;

/// <summary>Hub de tiempo real para notificaciones de solicitudes por tenant.</summary>
public class SolicitudesHub : Hub
{
    /// <summary>El cliente se une al grupo de su tenant para recibir solo sus notificaciones.</summary>
    public async Task UnirseATenant(string tenantId) =>
        await Groups.AddToGroupAsync(Context.ConnectionId, $"tenant-{tenantId}");
}

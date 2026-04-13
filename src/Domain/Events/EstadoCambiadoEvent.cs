using Domain.Enums;

namespace Domain.Events;

public record EstadoCambiadoEvent(
    Guid SolicitudId,
    Guid TenantId,
    EstadoSolicitud EstadoAnterior,
    EstadoSolicitud EstadoNuevo,
    Guid UsuarioId,
    string Titulo = "",
    string UsuarioCreadorNombre = "",
    string? UsuarioCreadorEmail = null
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OcurridoEn { get; } = DateTime.UtcNow;
    public string EventType => "EstadoCambiado";
}

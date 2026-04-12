namespace Domain.Events;

public record SolicitudCreadaEvent(
    Guid SolicitudId,
    Guid TenantId,
    string Titulo,
    string Descripcion,
    int Prioridad,
    Guid UsuarioCreadorId,
    string UsuarioCreadorNombre
) : IDomainEvent
{
    public Guid EventId { get; } = Guid.NewGuid();
    public DateTime OcurridoEn { get; } = DateTime.UtcNow;
    public string EventType => "SolicitudCreada";
}

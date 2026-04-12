namespace Domain.Events;

public interface IDomainEvent
{
    Guid EventId { get; }
    DateTime OcurridoEn { get; }
    string EventType { get; }
}

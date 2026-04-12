using Domain.Events;

namespace Domain.Interfaces;

public interface IServiceBusPublisher
{
    Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent;
}

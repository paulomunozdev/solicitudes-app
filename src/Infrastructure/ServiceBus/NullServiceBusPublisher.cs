using Domain.Events;
using Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Infrastructure.ServiceBus;

/// <summary>
/// Publisher no-op para entornos sin Service Bus configurado (desarrollo local).
/// </summary>
public class NullServiceBusPublisher(ILogger<NullServiceBusPublisher> logger) : IServiceBusPublisher
{
    public Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent
    {
        logger.LogWarning("Service Bus no configurado — evento {EventType} descartado (modo desarrollo).",
            domainEvent.EventType);
        return Task.CompletedTask;
    }
}

using System.Text.Json;
using Azure.Messaging.ServiceBus;
using Domain.Events;
using Domain.Interfaces;
using Microsoft.Extensions.Logging;

namespace Infrastructure.ServiceBus;

public class ServiceBusPublisher(ServiceBusClient client, ILogger<ServiceBusPublisher> logger) : IServiceBusPublisher
{
    private const string TopicName = "solicitudes-events";

    public async Task PublishAsync<T>(T domainEvent, CancellationToken ct = default) where T : IDomainEvent
    {
        var sender = client.CreateSender(TopicName);

        var message = new ServiceBusMessage(JsonSerializer.Serialize(domainEvent, domainEvent.GetType()))
        {
            MessageId = domainEvent.EventId.ToString(),
            Subject = domainEvent.EventType,
            ContentType = "application/json",
            ApplicationProperties =
            {
                ["EventType"] = domainEvent.EventType,
                ["OcurridoEn"] = domainEvent.OcurridoEn.ToString("O")
            }
        };

        await sender.SendMessageAsync(message, ct);
        logger.LogInformation("Evento {EventType} publicado en Service Bus. MessageId: {MessageId}",
            domainEvent.EventType, message.MessageId);
    }
}

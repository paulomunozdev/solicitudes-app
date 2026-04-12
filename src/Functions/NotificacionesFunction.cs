using Azure.Communication.Email;
using Azure.Messaging.ServiceBus;
using Functions.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace Functions;

public class NotificacionesFunction(
    EmailClient emailClient,
    IConfiguration config,
    ILogger<NotificacionesFunction> logger)
{
    private static readonly string[] PrioridadLabels = ["", "Baja", "Media", "Alta", "Crítica"];

    [Function(nameof(NotificacionesFunction))]
    public async Task Run(
        [ServiceBusTrigger("solicitudes-events", "notificaciones", Connection = "ServiceBusConnection")]
        ServiceBusReceivedMessage message,
        CancellationToken ct)
    {
        var eventType = message.Subject;
        logger.LogInformation("Procesando evento {EventType} — MessageId: {MessageId}", eventType, message.MessageId);

        if (eventType == "SolicitudCreada")
        {
            var evt = JsonSerializer.Deserialize<SolicitudCreadaEvent>(message.Body, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (evt is null) return;

            await EnviarEmailNuevaSolicitudAsync(evt, ct);
        }
    }

    private async Task EnviarEmailNuevaSolicitudAsync(SolicitudCreadaEvent evt, CancellationToken ct)
    {
        var adminEmail = config["AdminEmail"]!;
        var sender = config["AcsSenderAddress"]!;
        var prioridad = PrioridadLabels.ElementAtOrDefault(evt.Prioridad) ?? "Desconocida";

        var subject = $"[SolicitudesApp] Nueva solicitud: {evt.Titulo}";

        var htmlBody = $"""
            <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0f172a;padding:20px 28px;border-radius:12px 12px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">Nueva solicitud recibida</h2>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px">
                <h3 style="color:#0f172a;margin:0 0 8px">{evt.Titulo}</h3>
                <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 20px">{evt.Descripcion}</p>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  <tr>
                    <td style="padding:8px 0;color:#64748b;width:140px">Solicitante</td>
                    <td style="padding:8px 0;color:#1e293b;font-weight:500">{evt.UsuarioCreadorNombre}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b">Prioridad</td>
                    <td style="padding:8px 0;color:#1e293b;font-weight:500">{prioridad}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;color:#64748b">Fecha</td>
                    <td style="padding:8px 0;color:#1e293b;font-weight:500">{evt.OcurridoEn:dd/MM/yyyy HH:mm} UTC</td>
                  </tr>
                </table>
                <div style="margin-top:24px">
                  <a href="https://localhost:4200/solicitudes/{evt.SolicitudId}"
                     style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
                    Ver solicitud →
                  </a>
                </div>
              </div>
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px">SolicitudesApp · Notificación automática</p>
            </div>
            """;

        var emailMessage = new EmailMessage(
            senderAddress: sender,
            recipients: new EmailRecipients([new EmailAddress(adminEmail)]),
            content: new EmailContent(subject) { Html = htmlBody });

        var result = await emailClient.SendAsync(Azure.WaitUntil.Completed, emailMessage, ct);
        logger.LogInformation("Email enviado. OperationId: {OperationId}", result.Id);
    }
}

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
    private static readonly string[] EstadoLabels    = ["Pendiente", "En Revisión", "En Progreso", "Resuelto", "Cerrado", "Cancelado"];

    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNameCaseInsensitive = true };

    [Function(nameof(NotificacionesFunction))]
    public async Task Run(
        [ServiceBusTrigger("solicitudes-events", "notificaciones", Connection = "ServiceBusConnection")]
        ServiceBusReceivedMessage message,
        CancellationToken ct)
    {
        var eventType = message.Subject;
        logger.LogInformation("Procesando evento {EventType} — MessageId: {MessageId}", eventType, message.MessageId);

        switch (eventType)
        {
            case "SolicitudCreada":
                var evtCreada = JsonSerializer.Deserialize<SolicitudCreadaEvent>(message.Body, JsonOpts);
                if (evtCreada is not null) await EnviarEmailNuevaSolicitudAsync(evtCreada, ct);
                break;

            case "EstadoCambiado":
                var evtEstado = JsonSerializer.Deserialize<EstadoCambiadoEvent>(message.Body, JsonOpts);
                if (evtEstado is not null) await EnviarEmailCambioEstadoAsync(evtEstado, ct);
                break;

            default:
                logger.LogInformation("Evento {EventType} ignorado por esta Function.", eventType);
                break;
        }
    }

    private async Task EnviarEmailNuevaSolicitudAsync(SolicitudCreadaEvent evt, CancellationToken ct)
    {
        var adminEmail = config["AdminEmail"]!;
        var sender     = config["AcsSenderAddress"]!;
        var portalUrl  = config["PortalUrl"] ?? "https://witty-meadow-05cecf60f.7.azurestaticapps.net";
        var prioridad  = PrioridadLabels.ElementAtOrDefault(evt.Prioridad) ?? "Desconocida";

        var subject = $"[SolicitudesApp] Nueva solicitud: {evt.Titulo}";
        var htmlBody = BuildEmailHtml(
            "Nueva solicitud recibida",
            evt.Titulo,
            [
                ("Solicitante", evt.UsuarioCreadorNombre),
                ("Prioridad",   prioridad),
                ("Fecha",       $"{evt.OcurridoEn:dd/MM/yyyy HH:mm} UTC"),
            ],
            $"{portalUrl}/solicitudes/{evt.SolicitudId}",
            "Ver solicitud →");

        await SendEmailAsync(sender, adminEmail, subject, htmlBody, ct);
    }

    private async Task EnviarEmailCambioEstadoAsync(EstadoCambiadoEvent evt, CancellationToken ct)
    {
        var adminEmail    = config["AdminEmail"]!;
        var sender        = config["AcsSenderAddress"]!;
        var portalUrl     = config["PortalUrl"] ?? "https://witty-meadow-05cecf60f.7.azurestaticapps.net";
        var estadoAnterior = EstadoLabels.ElementAtOrDefault(evt.EstadoAnterior) ?? evt.EstadoAnterior.ToString();
        var estadoNuevo    = EstadoLabels.ElementAtOrDefault(evt.EstadoNuevo)    ?? evt.EstadoNuevo.ToString();

        var subject  = $"[SolicitudesApp] Solicitud actualizada: {evt.Titulo}";
        var htmlBody = BuildEmailHtml(
            "Estado de solicitud actualizado",
            evt.Titulo,
            [
                ("Estado anterior", estadoAnterior),
                ("Nuevo estado",    $"<strong style=\"color:#3b82f6\">{estadoNuevo}</strong>"),
                ("Actualizado por", evt.UsuarioCreadorNombre),
                ("Fecha",           $"{evt.OcurridoEn:dd/MM/yyyy HH:mm} UTC"),
            ],
            $"{portalUrl}/solicitudes/{evt.SolicitudId}",
            "Ver solicitud →");

        // Envía al admin y, si existe, al creador de la solicitud
        var recipients = new List<EmailAddress> { new(adminEmail) };
        if (!string.IsNullOrWhiteSpace(evt.UsuarioCreadorEmail) && evt.UsuarioCreadorEmail != adminEmail)
            recipients.Add(new(evt.UsuarioCreadorEmail));

        var emailMessage = new EmailMessage(
            senderAddress: sender,
            recipients: new EmailRecipients(recipients),
            content: new EmailContent(subject) { Html = htmlBody });

        var result = await emailClient.SendAsync(Azure.WaitUntil.Completed, emailMessage, ct);
        logger.LogInformation("Email EstadoCambiado enviado. OperationId: {Id}", result.Id);
    }

    private async Task SendEmailAsync(string sender, string to, string subject, string htmlBody, CancellationToken ct)
    {
        var emailMessage = new EmailMessage(
            senderAddress: sender,
            recipients: new EmailRecipients([new EmailAddress(to)]),
            content: new EmailContent(subject) { Html = htmlBody });

        var result = await emailClient.SendAsync(Azure.WaitUntil.Completed, emailMessage, ct);
        logger.LogInformation("Email enviado. OperationId: {OperationId}", result.Id);
    }

    private static string BuildEmailHtml(string titulo, string subtitulo, (string Label, string Value)[] rows, string ctaUrl, string ctaText)
    {
        var rowsHtml = string.Join("", rows.Select(r => $"""
            <tr>
              <td style="padding:8px 0;color:#64748b;width:160px">{r.Label}</td>
              <td style="padding:8px 0;color:#1e293b;font-weight:500">{r.Value}</td>
            </tr>
            """));

        return $"""
            <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto">
              <div style="background:#0f172a;padding:20px 28px;border-radius:12px 12px 0 0">
                <h2 style="color:#fff;margin:0;font-size:18px">{titulo}</h2>
              </div>
              <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 12px 12px">
                <h3 style="color:#0f172a;margin:0 0 8px">{subtitulo}</h3>
                <table style="width:100%;border-collapse:collapse;font-size:13px">
                  {rowsHtml}
                </table>
                <div style="margin-top:24px">
                  <a href="{ctaUrl}"
                     style="background:#3b82f6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500">
                    {ctaText}
                  </a>
                </div>
              </div>
              <p style="color:#94a3b8;font-size:11px;text-align:center;margin-top:16px">SolicitudesApp · Notificación automática</p>
            </div>
            """;
    }
}

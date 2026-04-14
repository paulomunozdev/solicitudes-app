using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Events;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

public record CrearSolicitudCommand(
    string Titulo,
    string Descripcion,
    PrioridadSolicitud Prioridad,
    string? Categoria,
    string? UnidadNegocio,
    string? NombreSolicitante
) : IRequest<Guid>;

public class CrearSolicitudValidator : AbstractValidator<CrearSolicitudCommand>
{
    public CrearSolicitudValidator()
    {
        RuleFor(x => x.Titulo)
            .NotEmpty().WithMessage("El título es requerido.")
            .MaximumLength(200).WithMessage("El título no puede superar 200 caracteres.");

        RuleFor(x => x.Descripcion)
            .NotEmpty().WithMessage("La descripción es requerida.")
            .MaximumLength(5000).WithMessage("La descripción no puede superar 5000 caracteres.");
    }
}

public class CrearSolicitudHandler(
    IUnitOfWork uow,
    IAppDbContext appDb,
    ICurrentUserService currentUser,
    IServiceBusPublisher publisher,
    IRealtimeNotifier realtime
) : IRequestHandler<CrearSolicitudCommand, Guid>
{
    public async Task<Guid> Handle(CrearSolicitudCommand cmd, CancellationToken ct)
    {
        // Calcular FechaLimite según SLA del tenant para esta prioridad
        var slaConfigs = await appDb.GetSlaConfigsAsync(ct);
        var sla = slaConfigs.FirstOrDefault(s => s.Prioridad == cmd.Prioridad);
        var fechaLimite = sla is not null
            ? DateTime.UtcNow.AddHours(sla.Horas)
            : (DateTime?)null; // sin SLA configurado: sin fecha límite

        var solicitud = new Solicitud
        {
            TenantId          = currentUser.TenantId,
            UsuarioCreadorId  = currentUser.UserId,
            Titulo            = cmd.Titulo,
            Descripcion       = cmd.Descripcion,
            Prioridad         = cmd.Prioridad,
            Categoria         = cmd.Categoria,
            UnidadNegocio     = cmd.UnidadNegocio,
            NombreSolicitante = string.IsNullOrWhiteSpace(cmd.NombreSolicitante)
                                    ? currentUser.UserName
                                    : cmd.NombreSolicitante,
            FechaLimite       = fechaLimite,
            Estado            = EstadoSolicitud.Pendiente
        };

        await uow.Solicitudes.AddAsync(solicitud, ct);
        await uow.SaveChangesAsync(ct);

        // Publicar evento al Service Bus → Function enviará el email
        await publisher.PublishAsync(new SolicitudCreadaEvent(
            solicitud.Id,
            solicitud.TenantId,
            solicitud.Titulo,
            solicitud.Descripcion,
            (int)solicitud.Prioridad,
            solicitud.UsuarioCreadorId,
            currentUser.UserName
        ), ct);

        // Notificar en tiempo real vía SignalR a todos los usuarios del tenant
        await realtime.NotificarSolicitudCreadaAsync(solicitud.TenantId, solicitud.Id, solicitud.Titulo, ct);

        return solicitud.Id;
    }
}

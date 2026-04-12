using Application.Common.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

public record ActualizarEstadoCommand(Guid SolicitudId, EstadoSolicitud NuevoEstado) : IRequest;

public class ActualizarEstadoValidator : AbstractValidator<ActualizarEstadoCommand>
{
    public ActualizarEstadoValidator()
    {
        RuleFor(x => x.SolicitudId).NotEmpty();
        RuleFor(x => x.NuevoEstado).IsInEnum().WithMessage("Estado no válido.");
    }
}

public class ActualizarEstadoHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    IServiceBusPublisher publisher,
    IRealtimeNotifier realtime
) : IRequestHandler<ActualizarEstadoCommand>
{
    public async Task Handle(ActualizarEstadoCommand cmd, CancellationToken ct)
    {
        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {cmd.SolicitudId} no encontrada.");

        var estadoAnterior = (int)solicitud.Estado;
        solicitud.CambiarEstado(cmd.NuevoEstado, currentUser.UserId);
        await uow.SaveChangesAsync(ct);

        foreach (var evt in solicitud.DomainEvents)
            await publisher.PublishAsync(evt, ct);

        solicitud.ClearDomainEvents();

        await realtime.NotificarEstadoCambiadoAsync(
            solicitud.TenantId, solicitud.Id, estadoAnterior, (int)cmd.NuevoEstado, ct);
    }
}

using Application.Common.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

/// <summary>
/// Asigna o desasigna el consultor de una solicitud.
/// ConsultorId = null desasigna. Solo Gestor y Admin pueden ejecutar este comando.
/// </summary>
public record ReasignarSolicitudCommand(Guid SolicitudId, Guid? ConsultorId) : IRequest;

public class ReasignarSolicitudValidator : AbstractValidator<ReasignarSolicitudCommand>
{
    public ReasignarSolicitudValidator()
    {
        RuleFor(x => x.SolicitudId).NotEmpty();
    }
}

public class ReasignarSolicitudHandler(
    IUnitOfWork uow,
    IAuditoriaService auditoria,
    ICurrentUserService currentUser
) : IRequestHandler<ReasignarSolicitudCommand>
{
    public async Task Handle(ReasignarSolicitudCommand cmd, CancellationToken ct)
    {
        if (currentUser.Rol is not (RolUsuario.Gestor or RolUsuario.Admin))
            throw new UnauthorizedAccessException("Solo Gestor y Admin pueden reasignar solicitudes.");

        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {cmd.SolicitudId} no encontrada.");

        var anteriorConsultorId = solicitud.ConsultorAsignadoId;
        solicitud.ConsultorAsignadoId = cmd.ConsultorId;
        solicitud.ActualizadoEn = DateTime.UtcNow;
        await uow.SaveChangesAsync(ct);

        var detalle = cmd.ConsultorId.HasValue
            ? $"Asignado a consultor {cmd.ConsultorId}. Anterior: {anteriorConsultorId?.ToString() ?? "ninguno"}"
            : $"Desasignado. Anterior: {anteriorConsultorId?.ToString() ?? "ninguno"}";

        await auditoria.RegistrarAsync(
            currentUser.TenantId, "Solicitud", cmd.SolicitudId,
            "Reasignacion", currentUser.UserId, currentUser.UserName,
            detalle, ct);
    }
}

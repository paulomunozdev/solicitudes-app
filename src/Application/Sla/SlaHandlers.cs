using Application.Common.Interfaces;
using Domain.Enums;
using FluentValidation;
using MediatR;

namespace Application.Sla;

// ── DTOs ───────────────────────────────────────────────��──────────────
public record SlaConfigDto(PrioridadSolicitud Prioridad, string PrioridadNombre, int Horas);

// ── Queries ───────────────────────────────────────────────────────────
public record GetSlaConfigsQuery : IRequest<IEnumerable<SlaConfigDto>>;

public class GetSlaConfigsHandler(IAppDbContext db) : IRequestHandler<GetSlaConfigsQuery, IEnumerable<SlaConfigDto>>
{
    public async Task<IEnumerable<SlaConfigDto>> Handle(GetSlaConfigsQuery _, CancellationToken ct)
    {
        var configs = await db.GetSlaConfigsAsync(ct);
        return configs.Select(c => new SlaConfigDto(c.Prioridad, c.Prioridad.ToString(), c.Horas));
    }
}

// ── Commands ──────────────────────────────────────────────────────────
public record ActualizarSlaCommand(PrioridadSolicitud Prioridad, int Horas) : IRequest;

public class ActualizarSlaValidator : AbstractValidator<ActualizarSlaCommand>
{
    public ActualizarSlaValidator()
    {
        RuleFor(x => x.Prioridad).IsInEnum().WithMessage("Prioridad no válida.");
        RuleFor(x => x.Horas)
            .GreaterThan(0).WithMessage("Las horas deben ser mayores a 0.")
            .LessThanOrEqualTo(8760).WithMessage("El SLA no puede superar 1 año (8760 horas).");
    }
}

public class ActualizarSlaHandler(IAppDbContext db, ICurrentUserService currentUser) : IRequestHandler<ActualizarSlaCommand>
{
    public async Task Handle(ActualizarSlaCommand cmd, CancellationToken ct)
    {
        if (currentUser.Rol != Domain.Enums.RolUsuario.Admin)
            throw new UnauthorizedAccessException("Solo Admin puede modificar la configuración de SLA.");

        await db.UpsertSlaConfigAsync(cmd.Prioridad, cmd.Horas, ct);
        await db.SaveChangesAsync(ct);
    }
}

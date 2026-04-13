using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetSolicitudesQuery(
    EstadoSolicitud? Estado = null,
    PrioridadSolicitud? Prioridad = null,
    string? Busqueda = null,
    int Page = 1,
    int PageSize = 10,
    bool SoloMias = false,
    bool SoloActivas = false,
    bool SoloCerradas = false,
    bool SoloAsignadaAMi = false
) : IRequest<PagedResult<SolicitudDto>>;

public class GetSolicitudesValidator : AbstractValidator<GetSolicitudesQuery>
{
    public GetSolicitudesValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize)
            .GreaterThanOrEqualTo(1).WithMessage("PageSize debe ser al menos 1.")
            .LessThanOrEqualTo(100).WithMessage("PageSize no puede superar 100.");
        RuleFor(x => x.Busqueda)
            .MaximumLength(200).When(x => x.Busqueda != null)
            .WithMessage("La búsqueda no puede superar 200 caracteres.");
    }
}

public class GetSolicitudesHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    : IRequestHandler<GetSolicitudesQuery, PagedResult<SolicitudDto>>
{
    public async Task<PagedResult<SolicitudDto>> Handle(GetSolicitudesQuery query, CancellationToken ct)
    {
        // Clamp defensivo — aunque el validador ya lo rechaza, nunca enviar más de 100 al repo
        var pageSize = Math.Clamp(query.PageSize, 1, 100);

        // Visibilidad base según rol
        string? soloBu      = null;
        Guid?   soloUsuario = null;

        if (currentUser.Rol is RolUsuario.Solicitante or RolUsuario.Observador)
        {
            if (!string.IsNullOrWhiteSpace(currentUser.UnidadNegocioNombre))
                soloBu = currentUser.UnidadNegocioNombre;
            else
                soloUsuario = currentUser.UserId;
        }

        // Vista "Mis solicitudes": override visibilidad base, mostrar solo las creadas por mí
        if (query.SoloMias)
        {
            soloBu      = null;
            soloUsuario = currentUser.UserId;
        }

        // Vista "Asignadas a mí": solo para Gestor/Admin
        Guid? soloAsignadoId = query.SoloAsignadaAMi
            && currentUser.Rol is RolUsuario.Gestor or RolUsuario.Admin
            ? currentUser.UserId : null;

        var (solicitudes, total) = await uow.Solicitudes.GetPagedAsync(
            query.Estado, query.Prioridad, query.Busqueda, query.Page, pageSize,
            soloBu, soloUsuario, soloAsignadoId,
            query.SoloActivas, query.SoloCerradas, ct);

        var items = solicitudes.Select(s => new SolicitudDto(
            s.Id, s.Titulo, s.Descripcion,
            s.Estado, s.Estado.ToString(),
            s.Prioridad, s.Prioridad.ToString(),
            s.Categoria, s.UnidadNegocio, s.NombreSolicitante,
            s.FechaLimite,
            s.UsuarioCreadorId, s.UsuarioCreador?.Nombre ?? string.Empty,
            s.ConsultorAsignadoId, s.ConsultorAsignado?.Nombre,
            s.CreadoEn, s.ActualizadoEn, s.Comentarios.Count
        ));

        return new PagedResult<SolicitudDto>(items, total, query.Page, pageSize);
    }
}

// ── Stats ──────────────────────────────────────────────────────
public record GetSolicitudesStatsQuery : IRequest<SolicitudesStatsDto>;

/// <summary>
/// Delega todo el cálculo al repositorio, que ejecuta GROUP BY directamente en SQL.
/// El handler solo mapea los datos crudos a los DTOs de presentación.
/// </summary>
public class GetSolicitudesStatsHandler(IUnitOfWork uow) : IRequestHandler<GetSolicitudesStatsQuery, SolicitudesStatsDto>
{
    public async Task<SolicitudesStatsDto> Handle(GetSolicitudesStatsQuery _, CancellationToken ct)
    {
        var raw = await uow.Solicitudes.GetStatsAsync(ct);

        // Conteos por estado a partir del diccionario compacto del repositorio
        int Conteo(EstadoSolicitud e) => raw.PorEstado.FirstOrDefault(x => x.Estado == e)?.Count ?? 0;

        return new SolicitudesStatsDto(
            Total:                        raw.PorEstado.Sum(x => x.Count),
            Pendientes:                   Conteo(EstadoSolicitud.Pendiente),
            EnRevision:                   Conteo(EstadoSolicitud.EnRevision),
            EnDesarrollo:                 Conteo(EstadoSolicitud.EnProgreso),
            Completadas:                  Conteo(EstadoSolicitud.Resuelto),
            Rechazadas:                   Conteo(EstadoSolicitud.Cancelado),
            PorDia:                       raw.PorDia.Select(x => new SolicitudesPorDiaDto(x.Fecha.ToString("dd/MM"), x.Count)),
            PorBu:                        raw.PorBu.Select(x => new ConteoItemDto(x.Nombre, x.Count)),
            PorCategoria:                 raw.PorCategoria.Select(x => new ConteoItemDto(x.Nombre, x.Count)),
            PorPrioridad:                 raw.PorPrioridad.Select(x => new ConteoItemDto(x.Prioridad.ToString(), x.Count)),
            TiempoPromedioResolucionDias: raw.TiempoPromedioResolucionDias,
            SinAsignar:                   raw.SinAsignar,
            PorResolutor:                 raw.PorResolutor.Select(x => new ResolutorStatsDto(x.Nombre, x.Asignadas, x.Completadas))
        );
    }
}

using Application.DTOs;
using Domain.Enums;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetSolicitudesQuery(
    EstadoSolicitud? Estado = null,
    PrioridadSolicitud? Prioridad = null,
    string? Busqueda = null,
    int Page = 1,
    int PageSize = 10
) : IRequest<PagedResult<SolicitudDto>>;

public class GetSolicitudesHandler(IUnitOfWork uow) : IRequestHandler<GetSolicitudesQuery, PagedResult<SolicitudDto>>
{
    public async Task<PagedResult<SolicitudDto>> Handle(GetSolicitudesQuery query, CancellationToken ct)
    {
        var (solicitudes, total) = await uow.Solicitudes.GetPagedAsync(
            query.Estado, query.Prioridad, query.Busqueda, query.Page, query.PageSize, ct);

        var items = solicitudes.Select(s => new SolicitudDto(
            s.Id, s.Titulo, s.Descripcion,
            s.Estado, s.Estado.ToString(),
            s.Prioridad, s.Prioridad.ToString(),
            s.Categoria, s.FechaLimite,
            s.UsuarioCreadorId, s.UsuarioCreador?.Nombre ?? string.Empty,
            s.ConsultorAsignadoId, s.ConsultorAsignado?.Nombre,
            s.CreadoEn, s.ActualizadoEn, s.Comentarios.Count
        ));

        return new PagedResult<SolicitudDto>(items, total, query.Page, query.PageSize);
    }
}

// ── Stats ──────────────────────────────────────────────────────
public record GetSolicitudesStatsQuery : IRequest<SolicitudesStatsDto>;

public class GetSolicitudesStatsHandler(IUnitOfWork uow) : IRequestHandler<GetSolicitudesStatsQuery, SolicitudesStatsDto>
{
    public async Task<SolicitudesStatsDto> Handle(GetSolicitudesStatsQuery _, CancellationToken ct)
    {
        var all = await uow.Solicitudes.GetAllAsync(ct);
        var lista = all.ToList();

        var porDia = lista
            .GroupBy(s => s.CreadoEn.Date)
            .OrderBy(g => g.Key)
            .TakeLast(30)
            .Select(g => new SolicitudesPorDiaDto(g.Key.ToString("dd/MM"), g.Count()));

        return new SolicitudesStatsDto(
            Total:        lista.Count,
            Pendientes:   lista.Count(s => s.Estado == EstadoSolicitud.Pendiente),
            EnRevision:   lista.Count(s => s.Estado == EstadoSolicitud.EnRevision),
            EnDesarrollo: lista.Count(s => s.Estado == EstadoSolicitud.EnProgreso),
            Completadas:  lista.Count(s => s.Estado == EstadoSolicitud.Resuelto),
            Rechazadas:   lista.Count(s => s.Estado == EstadoSolicitud.Cancelado),
            PorDia:       porDia
        );
    }
}

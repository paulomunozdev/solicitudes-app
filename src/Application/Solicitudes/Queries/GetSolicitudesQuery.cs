using Application.Common.Interfaces;
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
    int PageSize = 10,
    bool SoloMias = false,
    bool SoloActivas = false,
    bool SoloCerradas = false,
    bool SoloAsignadaAMi = false
) : IRequest<PagedResult<SolicitudDto>>;

public class GetSolicitudesHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    : IRequestHandler<GetSolicitudesQuery, PagedResult<SolicitudDto>>
{
    public async Task<PagedResult<SolicitudDto>> Handle(GetSolicitudesQuery query, CancellationToken ct)
    {
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
            query.Estado, query.Prioridad, query.Busqueda, query.Page, query.PageSize,
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

        // ── Métricas base ──────────────────────────────────────────
        var porDia = lista
            .GroupBy(s => s.CreadoEn.Date)
            .OrderBy(g => g.Key)
            .TakeLast(30)
            .Select(g => new SolicitudesPorDiaDto(g.Key.ToString("dd/MM"), g.Count()));

        // ── Por Unidad de Negocio ──────────────────────────────────
        var porBu = lista
            .Where(s => !string.IsNullOrWhiteSpace(s.UnidadNegocio))
            .GroupBy(s => s.UnidadNegocio!)
            .Select(g => new ConteoItemDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Cantidad);

        // ── Por Categoría ──────────────────────────────────────────
        var porCategoria = lista
            .Where(s => !string.IsNullOrWhiteSpace(s.Categoria))
            .GroupBy(s => s.Categoria!)
            .Select(g => new ConteoItemDto(g.Key, g.Count()))
            .OrderByDescending(x => x.Cantidad);

        // ── Por Prioridad ──────────────────────────────────────────
        var porPrioridad = lista
            .GroupBy(s => s.Prioridad)
            .Select(g => new ConteoItemDto(g.Key.ToString(), g.Count()))
            .OrderBy(x => x.Nombre);

        // ── Tiempo promedio de resolución (días) ───────────────────
        var resueltas = lista.Where(s => s.Estado == EstadoSolicitud.Resuelto).ToList();
        var tiempoPromedio = resueltas.Count > 0
            ? resueltas.Average(s => (s.ActualizadoEn - s.CreadoEn).TotalDays)
            : 0;

        // ── Sin asignar (activas sin consultor) ────────────────────
        var sinAsignar = lista.Count(s =>
            s.ConsultorAsignadoId == null &&
            (s.Estado == EstadoSolicitud.Pendiente ||
             s.Estado == EstadoSolicitud.EnRevision ||
             s.Estado == EstadoSolicitud.EnProgreso));

        // ── Por resolutor ──────────────────────────────────────────
        var porResolutor = lista
            .Where(s => s.ConsultorAsignado != null)
            .GroupBy(s => s.ConsultorAsignado!.Nombre)
            .Select(g => new ResolutorStatsDto(
                g.Key,
                g.Count(),
                g.Count(s => s.Estado == EstadoSolicitud.Resuelto)))
            .OrderByDescending(x => x.Asignadas);

        return new SolicitudesStatsDto(
            Total:                       lista.Count,
            Pendientes:                  lista.Count(s => s.Estado == EstadoSolicitud.Pendiente),
            EnRevision:                  lista.Count(s => s.Estado == EstadoSolicitud.EnRevision),
            EnDesarrollo:                lista.Count(s => s.Estado == EstadoSolicitud.EnProgreso),
            Completadas:                 lista.Count(s => s.Estado == EstadoSolicitud.Resuelto),
            Rechazadas:                  lista.Count(s => s.Estado == EstadoSolicitud.Cancelado),
            PorDia:                      porDia,
            PorBu:                       porBu,
            PorCategoria:                porCategoria,
            PorPrioridad:                porPrioridad,
            TiempoPromedioResolucionDias: Math.Round(tiempoPromedio, 1),
            SinAsignar:                  sinAsignar,
            PorResolutor:                porResolutor
        );
    }
}

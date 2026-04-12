using Application.DTOs;
using Domain.Enums;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetSolicitudesQuery(EstadoSolicitud? Estado = null) : IRequest<IEnumerable<SolicitudDto>>;

public class GetSolicitudesHandler(IUnitOfWork uow) : IRequestHandler<GetSolicitudesQuery, IEnumerable<SolicitudDto>>
{
    public async Task<IEnumerable<SolicitudDto>> Handle(GetSolicitudesQuery query, CancellationToken ct)
    {
        var solicitudes = query.Estado.HasValue
            ? await uow.Solicitudes.GetByEstadoAsync(query.Estado.Value, ct)
            : await uow.Solicitudes.GetAllAsync(ct);

        return solicitudes.Select(s => new SolicitudDto(
            s.Id,
            s.Titulo,
            s.Descripcion,
            s.Estado,
            s.Estado.ToString(),
            s.Prioridad,
            s.Prioridad.ToString(),
            s.Categoria,
            s.FechaLimite,
            s.UsuarioCreadorId,
            s.UsuarioCreador?.Nombre ?? string.Empty,
            s.ConsultorAsignadoId,
            s.ConsultorAsignado?.Nombre,
            s.CreadoEn,
            s.ActualizadoEn,
            s.Comentarios.Count
        ));
    }
}

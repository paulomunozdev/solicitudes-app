using Application.DTOs;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetSolicitudByIdQuery(Guid Id) : IRequest<SolicitudDto>;

public class GetSolicitudByIdHandler(IUnitOfWork uow) : IRequestHandler<GetSolicitudByIdQuery, SolicitudDto>
{
    public async Task<SolicitudDto> Handle(GetSolicitudByIdQuery query, CancellationToken ct)
    {
        var s = await uow.Solicitudes.GetByIdAsync(query.Id, ct)
            ?? throw new KeyNotFoundException($"Solicitud {query.Id} no encontrada.");

        return new SolicitudDto(
            s.Id, s.Titulo, s.Descripcion, s.Estado, s.Estado.ToString(),
            s.Prioridad, s.Prioridad.ToString(), s.Categoria, s.FechaLimite,
            s.UsuarioCreadorId, s.UsuarioCreador?.Nombre ?? string.Empty,
            s.ConsultorAsignadoId, s.ConsultorAsignado?.Nombre,
            s.CreadoEn, s.ActualizadoEn, s.Comentarios.Count
        );
    }
}

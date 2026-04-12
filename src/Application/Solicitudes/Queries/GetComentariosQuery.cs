using Application.DTOs;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetComentariosQuery(Guid SolicitudId) : IRequest<List<ComentarioDto>>;

public class GetComentariosHandler(IUnitOfWork uow) : IRequestHandler<GetComentariosQuery, List<ComentarioDto>>
{
    public async Task<List<ComentarioDto>> Handle(GetComentariosQuery query, CancellationToken ct)
    {
        var comentarios = await uow.Comentarios.GetBySolicitudAsync(query.SolicitudId, ct);
        return comentarios.Select(c => new ComentarioDto(
            c.Id, c.Texto, c.EsInterno,
            c.Usuario?.Nombre ?? "Usuario", c.CreadoEn)).ToList();
    }
}

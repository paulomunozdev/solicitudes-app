using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Enums;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetComentariosQuery(Guid SolicitudId) : IRequest<List<ComentarioDto>>;

public class GetComentariosHandler(IUnitOfWork uow, ICurrentUserService currentUser)
    : IRequestHandler<GetComentariosQuery, List<ComentarioDto>>
{
    public async Task<List<ComentarioDto>> Handle(GetComentariosQuery query, CancellationToken ct)
    {
        var comentarios = await uow.Comentarios.GetBySolicitudAsync(query.SolicitudId, ct);

        // Los comentarios internos son visibles solo para Gestor y Admin
        var puedeVerInternos = currentUser.Rol >= RolUsuario.Gestor;
        if (!puedeVerInternos)
            comentarios = comentarios.Where(c => !c.EsInterno).ToList();

        return comentarios.Select(c => new ComentarioDto(
            c.Id, c.Texto, c.EsInterno,
            c.Usuario?.Nombre ?? "Usuario", c.CreadoEn)).ToList();
    }
}

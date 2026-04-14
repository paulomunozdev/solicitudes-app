using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Interfaces;
using MediatR;

namespace Application.Solicitudes.Queries;

public record GetArchivosQuery(Guid SolicitudId) : IRequest<IEnumerable<ArchivoAdjuntoDto>>;

public class GetArchivosHandler(IUnitOfWork uow, IBlobStorageService blob)
    : IRequestHandler<GetArchivosQuery, IEnumerable<ArchivoAdjuntoDto>>
{
    public async Task<IEnumerable<ArchivoAdjuntoDto>> Handle(GetArchivosQuery query, CancellationToken ct)
    {
        var solicitud = await uow.Solicitudes.GetByIdAsync(query.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {query.SolicitudId} no encontrada.");

        return solicitud.Archivos.Select(a => new ArchivoAdjuntoDto(
            a.Id, a.NombreArchivo,
            blob.GenerarUrlDescarga(a.BlobUrl, minutosExpiracion: 60), // SAS URL válida 1 hora
            a.ContentType, a.TamanoBytes,
            a.Solicitud?.UsuarioCreador?.Nombre ?? string.Empty,
            a.CreadoEn));
    }
}

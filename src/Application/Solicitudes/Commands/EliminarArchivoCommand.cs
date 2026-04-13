using Application.Common.Interfaces;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

public record EliminarArchivoCommand(Guid SolicitudId, Guid ArchivoId) : IRequest;

public class EliminarArchivoValidator : AbstractValidator<EliminarArchivoCommand>
{
    public EliminarArchivoValidator()
    {
        RuleFor(x => x.SolicitudId).NotEmpty();
        RuleFor(x => x.ArchivoId).NotEmpty();
    }
}

public class EliminarArchivoHandler(
    IUnitOfWork uow,
    IBlobStorageService blob,
    IAuditoriaService auditoria,
    ICurrentUserService currentUser
) : IRequestHandler<EliminarArchivoCommand>
{
    public async Task Handle(EliminarArchivoCommand cmd, CancellationToken ct)
    {
        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {cmd.SolicitudId} no encontrada.");

        var archivo = solicitud.Archivos.FirstOrDefault(a => a.Id == cmd.ArchivoId)
            ?? throw new KeyNotFoundException($"Archivo {cmd.ArchivoId} no encontrado.");

        // Solo el subidor o Gestor/Admin puede eliminar
        if (archivo.SubidoPorId != currentUser.UserId
            && currentUser.Rol < RolUsuario.Gestor)
        {
            throw new UnauthorizedAccessException("No tienes permiso para eliminar este archivo.");
        }

        await blob.EliminarArchivoAsync(archivo.BlobUrl, ct);
        solicitud.Archivos.Remove(archivo);
        await uow.SaveChangesAsync(ct);

        await auditoria.RegistrarAsync(
            currentUser.TenantId, "Solicitud", cmd.SolicitudId,
            "ArchivoEliminado", currentUser.UserId, currentUser.UserName,
            $"Archivo: {archivo.NombreArchivo}", ct);
    }
}

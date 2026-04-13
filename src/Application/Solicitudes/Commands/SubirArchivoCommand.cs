using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

public record SubirArchivoCommand(
    Guid SolicitudId,
    string NombreArchivo,
    string ContentType,
    long TamanoBytes,
    Stream Contenido
) : IRequest<Guid>;

public class SubirArchivoValidator : AbstractValidator<SubirArchivoCommand>
{
    private static readonly string[] ContentTypesPermitidos =
    [
        "image/jpeg", "image/png", "image/gif", "image/webp",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "text/plain", "text/csv"
    ];

    public SubirArchivoValidator()
    {
        RuleFor(x => x.SolicitudId).NotEmpty();
        RuleFor(x => x.NombreArchivo).NotEmpty().MaximumLength(500);
        RuleFor(x => x.ContentType)
            .Must(ct => ContentTypesPermitidos.Contains(ct.ToLowerInvariant()))
            .WithMessage("Tipo de archivo no permitido.");
        RuleFor(x => x.TamanoBytes)
            .GreaterThan(0).WithMessage("El archivo está vacío.")
            .LessThanOrEqualTo(10 * 1024 * 1024).WithMessage("El archivo no puede superar 10 MB.");
    }
}

public class SubirArchivoHandler(
    IUnitOfWork uow,
    IBlobStorageService blob,
    IAuditoriaService auditoria,
    ICurrentUserService currentUser
) : IRequestHandler<SubirArchivoCommand, Guid>
{
    public async Task<Guid> Handle(SubirArchivoCommand cmd, CancellationToken ct)
    {
        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {cmd.SolicitudId} no encontrada.");

        // Solo activas aceptan archivos
        if (solicitud.Estado is EstadoSolicitud.Resuelto or EstadoSolicitud.Cancelado or EstadoSolicitud.Cerrado)
            throw new InvalidOperationException("No se pueden adjuntar archivos a solicitudes cerradas.");

        var blobUrl = await blob.SubirArchivoAsync(cmd.NombreArchivo, cmd.ContentType, cmd.Contenido, ct);

        var archivo = new ArchivoAdjunto
        {
            SolicitudId   = cmd.SolicitudId,
            TenantId      = currentUser.TenantId,
            NombreArchivo = cmd.NombreArchivo,
            ContentType   = cmd.ContentType,
            TamanoBytes   = cmd.TamanoBytes,
            BlobUrl       = blobUrl,
            SubidoPorId   = currentUser.UserId,
        };

        solicitud.Archivos.Add(archivo);
        await uow.SaveChangesAsync(ct);

        await auditoria.RegistrarAsync(
            currentUser.TenantId, "Solicitud", cmd.SolicitudId,
            "NuevoArchivo", currentUser.UserId, currentUser.UserName,
            $"Archivo: {cmd.NombreArchivo}", ct);

        return archivo.Id;
    }
}

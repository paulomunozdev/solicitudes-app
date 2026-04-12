using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Interfaces;
using FluentValidation;
using MediatR;

namespace Application.Solicitudes.Commands;

public record AgregarComentarioCommand(Guid SolicitudId, string Texto, bool EsInterno) : IRequest<Guid>;

public class AgregarComentarioValidator : AbstractValidator<AgregarComentarioCommand>
{
    public AgregarComentarioValidator()
    {
        RuleFor(x => x.SolicitudId).NotEmpty();
        RuleFor(x => x.Texto).NotEmpty().MaximumLength(2000);
    }
}

public class AgregarComentarioHandler(
    IUnitOfWork uow,
    ICurrentUserService currentUser,
    IRealtimeNotifier realtime
) : IRequestHandler<AgregarComentarioCommand, Guid>
{
    public async Task<Guid> Handle(AgregarComentarioCommand cmd, CancellationToken ct)
    {
        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException($"Solicitud {cmd.SolicitudId} no encontrada.");

        var comentario = new Comentario
        {
            SolicitudId = cmd.SolicitudId,
            TenantId = currentUser.TenantId,
            UsuarioId = currentUser.UserId,
            Texto = cmd.Texto,
            EsInterno = cmd.EsInterno,
        };

        await uow.Comentarios.AddAsync(comentario, ct);
        await uow.SaveChangesAsync(ct);

        await realtime.NotificarComentarioAgregadoAsync(
            solicitud.TenantId, cmd.SolicitudId, currentUser.UserName, cmd.Texto, ct);

        return comentario.Id;
    }
}

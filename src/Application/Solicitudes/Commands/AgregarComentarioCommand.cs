using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
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
        RuleFor(x => x.Texto)
            .NotEmpty()
            .MaximumLength(2000);
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
        // Solo Gestor y Admin pueden marcar un comentario como interno
        var esInterno = cmd.EsInterno && currentUser.Rol >= RolUsuario.Gestor;

        var solicitud = await uow.Solicitudes.GetByIdAsync(cmd.SolicitudId, ct)
            ?? throw new KeyNotFoundException("Solicitud no encontrada.");

        var comentario = new Comentario
        {
            SolicitudId = cmd.SolicitudId,
            TenantId    = currentUser.TenantId,
            UsuarioId   = currentUser.UserId,
            Texto       = cmd.Texto,
            EsInterno   = esInterno,
        };

        await uow.Comentarios.AddAsync(comentario, ct);
        await uow.SaveChangesAsync(ct);

        // Solo notificar por SignalR si el comentario NO es interno
        // (evita filtrar en el cliente, que no puede confiar en el flag)
        if (!esInterno)
        {
            await realtime.NotificarComentarioAgregadoAsync(
                solicitud.TenantId, cmd.SolicitudId, currentUser.UserName, cmd.Texto, ct);
        }

        return comentario.Id;
    }
}

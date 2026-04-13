using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Entities;
using MediatR;

namespace Application.UnidadesNegocio;

public record GetUnidadesNegocioQuery(bool SoloActivas = false) : IRequest<IEnumerable<UnidadNegocioDto>>;

public class GetUnidadesNegocioHandler(IAppDbContext db)
    : IRequestHandler<GetUnidadesNegocioQuery, IEnumerable<UnidadNegocioDto>>
{
    public async Task<IEnumerable<UnidadNegocioDto>> Handle(GetUnidadesNegocioQuery q, CancellationToken ct)
    {
        var list = await db.GetUnidadesNegocioAsync(q.SoloActivas, ct);
        return list.Select(u => new UnidadNegocioDto(u.Id, u.Nombre, u.Color, u.Activo));
    }
}

public record CrearUnidadNegocioCommand(string Nombre, string Color) : IRequest<Guid>;

public class CrearUnidadNegocioHandler(IAppDbContext db, ICurrentUserService user)
    : IRequestHandler<CrearUnidadNegocioCommand, Guid>
{
    public async Task<Guid> Handle(CrearUnidadNegocioCommand cmd, CancellationToken ct)
    {
        var unidad = new UnidadNegocio
        {
            TenantId = user.TenantId,
            Nombre   = cmd.Nombre.Trim(),
            Color    = cmd.Color,
            Activo   = true,
        };
        db.AddUnidadNegocio(unidad);
        await db.SaveChangesAsync(ct);
        return unidad.Id;
    }
}

public record ActualizarUnidadNegocioCommand(Guid Id, string Nombre, string Color, bool Activo) : IRequest;

public class ActualizarUnidadNegocioHandler(IAppDbContext db)
    : IRequestHandler<ActualizarUnidadNegocioCommand>
{
    public async Task Handle(ActualizarUnidadNegocioCommand cmd, CancellationToken ct)
    {
        var unidad = await db.GetUnidadNegocioByIdAsync(cmd.Id, ct)
            ?? throw new KeyNotFoundException($"Unidad de negocio {cmd.Id} no encontrada.");
        unidad.Nombre = cmd.Nombre.Trim();
        unidad.Color  = cmd.Color;
        unidad.Activo = cmd.Activo;
        unidad.ActualizadoEn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

public record EliminarUnidadNegocioCommand(Guid Id) : IRequest;

public class EliminarUnidadNegocioHandler(IAppDbContext db)
    : IRequestHandler<EliminarUnidadNegocioCommand>
{
    public async Task Handle(EliminarUnidadNegocioCommand cmd, CancellationToken ct)
    {
        var unidad = await db.GetUnidadNegocioByIdAsync(cmd.Id, ct)
            ?? throw new KeyNotFoundException($"Unidad de negocio {cmd.Id} no encontrada.");
        unidad.Activo = false;
        unidad.ActualizadoEn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

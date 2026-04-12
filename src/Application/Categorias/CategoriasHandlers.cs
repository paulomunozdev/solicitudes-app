using Application.Common.Interfaces;
using Application.DTOs;
using Domain.Entities;
using MediatR;

namespace Application.Categorias;

// ── Queries ────────────────────────────────────────────────────
public record GetCategoriasQuery(bool SoloActivas = false) : IRequest<IEnumerable<CategoriaDto>>;

public class GetCategoriasHandler(IAppDbContext db) : IRequestHandler<GetCategoriasQuery, IEnumerable<CategoriaDto>>
{
    public async Task<IEnumerable<CategoriaDto>> Handle(GetCategoriasQuery q, CancellationToken ct)
    {
        var list = await db.GetCategoriasAsync(q.SoloActivas, ct);
        return list.Select(c => new CategoriaDto(c.Id, c.Nombre, c.Color, c.Activo));
    }
}

// ── Commands ───────────────────────────────────────────────────
public record CrearCategoriaCommand(string Nombre, string Color) : IRequest<Guid>;

public class CrearCategoriaHandler(IAppDbContext db, ICurrentUserService user)
    : IRequestHandler<CrearCategoriaCommand, Guid>
{
    public async Task<Guid> Handle(CrearCategoriaCommand cmd, CancellationToken ct)
    {
        var categoria = new Categoria
        {
            TenantId = user.TenantId,
            Nombre   = cmd.Nombre.Trim(),
            Color    = cmd.Color,
            Activo   = true,
        };
        db.AddCategoria(categoria);
        await db.SaveChangesAsync(ct);
        return categoria.Id;
    }
}

public record ActualizarCategoriaCommand(Guid Id, string Nombre, string Color, bool Activo) : IRequest;

public class ActualizarCategoriaHandler(IAppDbContext db)
    : IRequestHandler<ActualizarCategoriaCommand>
{
    public async Task Handle(ActualizarCategoriaCommand cmd, CancellationToken ct)
    {
        var categoria = await db.GetCategoriaByIdAsync(cmd.Id, ct)
            ?? throw new KeyNotFoundException($"Categoría {cmd.Id} no encontrada.");
        categoria.Nombre = cmd.Nombre.Trim();
        categoria.Color  = cmd.Color;
        categoria.Activo = cmd.Activo;
        categoria.ActualizadoEn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

public record EliminarCategoriaCommand(Guid Id) : IRequest;

public class EliminarCategoriaHandler(IAppDbContext db)
    : IRequestHandler<EliminarCategoriaCommand>
{
    public async Task Handle(EliminarCategoriaCommand cmd, CancellationToken ct)
    {
        var categoria = await db.GetCategoriaByIdAsync(cmd.Id, ct)
            ?? throw new KeyNotFoundException($"Categoría {cmd.Id} no encontrada.");
        categoria.Activo = false;
        categoria.ActualizadoEn = DateTime.UtcNow;
        await db.SaveChangesAsync(ct);
    }
}

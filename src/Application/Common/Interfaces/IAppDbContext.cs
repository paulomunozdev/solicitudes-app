using Domain.Entities;

namespace Application.Common.Interfaces;

public interface IAppDbContext
{
    Task<List<Categoria>> GetCategoriasAsync(bool soloActivas, CancellationToken ct);
    Task<Categoria?> GetCategoriaByIdAsync(Guid id, CancellationToken ct);
    void AddCategoria(Categoria categoria);

    Task<List<UnidadNegocio>> GetUnidadesNegocioAsync(bool soloActivas, CancellationToken ct);
    Task<UnidadNegocio?> GetUnidadNegocioByIdAsync(Guid id, CancellationToken ct);
    void AddUnidadNegocio(UnidadNegocio unidad);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

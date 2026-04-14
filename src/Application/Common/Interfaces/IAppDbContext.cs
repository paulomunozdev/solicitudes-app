using Domain.Entities;
using Domain.Enums;

namespace Application.Common.Interfaces;

public interface IAppDbContext
{
    Task<List<Categoria>> GetCategoriasAsync(bool soloActivas, CancellationToken ct);
    Task<Categoria?> GetCategoriaByIdAsync(Guid id, CancellationToken ct);
    void AddCategoria(Categoria categoria);

    Task<List<UnidadNegocio>> GetUnidadesNegocioAsync(bool soloActivas, CancellationToken ct);
    Task<UnidadNegocio?> GetUnidadNegocioByIdAsync(Guid id, CancellationToken ct);
    void AddUnidadNegocio(UnidadNegocio unidad);

    Task<List<SlaConfig>> GetSlaConfigsAsync(CancellationToken ct);
    Task UpsertSlaConfigAsync(PrioridadSolicitud prioridad, int horas, CancellationToken ct);

    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

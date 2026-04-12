using Domain.Entities;
using Domain.Enums;

namespace Domain.Interfaces;

public interface ISolicitudRepository
{
    Task<Solicitud?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<Solicitud>> GetAllAsync(CancellationToken ct = default);
    Task<IEnumerable<Solicitud>> GetByEstadoAsync(EstadoSolicitud estado, CancellationToken ct = default);
    Task<(IEnumerable<Solicitud> Items, int Total)> GetPagedAsync(
        EstadoSolicitud? estado, PrioridadSolicitud? prioridad,
        string? busqueda, int page, int pageSize, CancellationToken ct = default);
    Task AddAsync(Solicitud solicitud, CancellationToken ct = default);
    Task UpdateAsync(Solicitud solicitud, CancellationToken ct = default);
    Task<bool> ExistsAsync(Guid id, CancellationToken ct = default);
}

public interface IComentarioRepository
{
    Task AddAsync(Domain.Entities.Comentario comentario, CancellationToken ct = default);
    Task<IEnumerable<Domain.Entities.Comentario>> GetBySolicitudAsync(Guid solicitudId, CancellationToken ct = default);
}

public interface IUnitOfWork
{
    ISolicitudRepository Solicitudes { get; }
    IComentarioRepository Comentarios { get; }
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

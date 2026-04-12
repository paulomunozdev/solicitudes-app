using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence.Repositories;

public class SolicitudRepository(AppDbContext db) : ISolicitudRepository
{
    public async Task<Solicitud?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await db.Solicitudes
            .Include(s => s.UsuarioCreador)
            .Include(s => s.ConsultorAsignado)
            .Include(s => s.Comentarios)
            .Include(s => s.Archivos)
            .FirstOrDefaultAsync(s => s.Id == id, ct);

    public async Task<IEnumerable<Solicitud>> GetAllAsync(CancellationToken ct = default)
        => await db.Solicitudes
            .Include(s => s.UsuarioCreador)
            .Include(s => s.ConsultorAsignado)
            .Include(s => s.Comentarios)
            .OrderByDescending(s => s.CreadoEn)
            .ToListAsync(ct);

    public async Task<IEnumerable<Solicitud>> GetByEstadoAsync(EstadoSolicitud estado, CancellationToken ct = default)
        => await db.Solicitudes
            .Include(s => s.UsuarioCreador)
            .Include(s => s.ConsultorAsignado)
            .Where(s => s.Estado == estado)
            .OrderByDescending(s => s.CreadoEn)
            .ToListAsync(ct);

    public async Task AddAsync(Solicitud solicitud, CancellationToken ct = default)
        => await db.Solicitudes.AddAsync(solicitud, ct);

    public Task UpdateAsync(Solicitud solicitud, CancellationToken ct = default)
    {
        db.Solicitudes.Update(solicitud);
        return Task.CompletedTask;
    }

    public async Task<bool> ExistsAsync(Guid id, CancellationToken ct = default)
        => await db.Solicitudes.AnyAsync(s => s.Id == id, ct);
}

public class ComentarioRepository(AppDbContext db) : IComentarioRepository
{
    public async Task AddAsync(Comentario comentario, CancellationToken ct = default)
        => await db.Comentarios.AddAsync(comentario, ct);

    public async Task<IEnumerable<Comentario>> GetBySolicitudAsync(Guid solicitudId, CancellationToken ct = default)
        => await db.Comentarios
            .Include(c => c.Usuario)
            .Where(c => c.SolicitudId == solicitudId)
            .OrderBy(c => c.CreadoEn)
            .ToListAsync(ct);
}

public class UnitOfWork(AppDbContext db, SolicitudRepository solicitudRepo, ComentarioRepository comentarioRepo) : IUnitOfWork
{
    public ISolicitudRepository Solicitudes => solicitudRepo;
    public IComentarioRepository Comentarios => comentarioRepo;

    public async Task<int> SaveChangesAsync(CancellationToken ct = default)
        => await db.SaveChangesAsync(ct);
}

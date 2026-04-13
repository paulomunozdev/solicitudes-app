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

    public async Task<(IEnumerable<Solicitud> Items, int Total)> GetPagedAsync(
        EstadoSolicitud? estado, PrioridadSolicitud? prioridad,
        string? busqueda, int page, int pageSize,
        string? soloBu = null, Guid? soloUsuarioId = null,
        Guid? soloAsignadoId = null,
        bool soloActivas = false, bool soloCerradas = false,
        CancellationToken ct = default)
    {
        var q = db.Solicitudes
            .Include(s => s.UsuarioCreador)
            .Include(s => s.ConsultorAsignado)
            .Include(s => s.Comentarios)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(soloBu))
            q = q.Where(s => s.UnidadNegocio == soloBu);
        else if (soloUsuarioId.HasValue)
            q = q.Where(s => s.UsuarioCreadorId == soloUsuarioId.Value);

        if (soloAsignadoId.HasValue)
            q = q.Where(s => s.ConsultorAsignadoId == soloAsignadoId.Value);

        if (soloActivas)
            q = q.Where(s => s.Estado == EstadoSolicitud.Pendiente
                           || s.Estado == EstadoSolicitud.EnRevision
                           || s.Estado == EstadoSolicitud.EnProgreso);
        else if (soloCerradas)
            q = q.Where(s => s.Estado == EstadoSolicitud.Resuelto
                           || s.Estado == EstadoSolicitud.Cerrado
                           || s.Estado == EstadoSolicitud.Cancelado);
        else if (estado.HasValue)
            q = q.Where(s => s.Estado == estado.Value);

        if (prioridad.HasValue)
            q = q.Where(s => s.Prioridad == prioridad.Value);

        if (!string.IsNullOrWhiteSpace(busqueda))
            q = q.Where(s => s.Titulo.Contains(busqueda) || s.Descripcion.Contains(busqueda));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(s => s.CreadoEn)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    /// <summary>
    /// Calcula estadísticas del tenant mediante queries GROUP BY en SQL.
    /// Ningún registro de solicitud se carga en memoria.
    /// EF Core corre las queries de forma secuencial (no soporta concurrencia en el mismo DbContext).
    /// </summary>
    public async Task<SolicitudStatsData> GetStatsAsync(CancellationToken ct = default)
    {
        var q = db.Solicitudes; // el global query filter de tenant ya está aplicado

        // 1. Conteo por estado
        var porEstado = (await q
            .GroupBy(s => s.Estado)
            .Select(g => new { Estado = g.Key, Count = g.Count() })
            .ToListAsync(ct))
            .Select(x => new EstadoConteo(x.Estado, x.Count))
            .ToList();

        // 2. Conteo por Unidad de Negocio
        var porBu = (await q
            .Where(s => s.UnidadNegocio != null && s.UnidadNegocio != string.Empty)
            .GroupBy(s => s.UnidadNegocio!)
            .Select(g => new { Nombre = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync(ct))
            .Select(x => new NombreConteo(x.Nombre, x.Count))
            .ToList();

        // 3. Conteo por Categoría
        var porCategoria = (await q
            .Where(s => s.Categoria != null && s.Categoria != string.Empty)
            .GroupBy(s => s.Categoria!)
            .Select(g => new { Nombre = g.Key, Count = g.Count() })
            .OrderByDescending(x => x.Count)
            .ToListAsync(ct))
            .Select(x => new NombreConteo(x.Nombre, x.Count))
            .ToList();

        // 4. Conteo por Prioridad
        var porPrioridad = (await q
            .GroupBy(s => s.Prioridad)
            .Select(g => new { Prioridad = g.Key, Count = g.Count() })
            .ToListAsync(ct))
            .Select(x => new PrioridadConteo(x.Prioridad, x.Count))
            .ToList();

        // 5. Tiempo promedio de resolución en días (solo solicitudes Resueltas)
        //    Nullable average: retorna null si no hay filas, que mapeamos a 0.
        var tiempoPromedio = await q
            .Where(s => s.Estado == EstadoSolicitud.Resuelto)
            .Select(s => (double?)EF.Functions.DateDiffDay(s.CreadoEn, s.ActualizadoEn))
            .AverageAsync(ct) ?? 0;

        // 6. Sin asignar: activas sin consultor asignado
        var sinAsignar = await q.CountAsync(s =>
            s.ConsultorAsignadoId == null &&
            (s.Estado == EstadoSolicitud.Pendiente ||
             s.Estado == EstadoSolicitud.EnRevision ||
             s.Estado == EstadoSolicitud.EnProgreso), ct);

        // 7. Por resolutor: GROUP BY nombre del consultor asignado
        //    EF Core 8 traduce g.Count(predicate) a SUM(CASE WHEN ... THEN 1 ELSE 0 END)
        var porResolutor = (await q
            .Where(s => s.ConsultorAsignadoId != null)
            .GroupBy(s => s.ConsultorAsignado!.Nombre)
            .Select(g => new
            {
                Nombre      = g.Key,
                Asignadas   = g.Count(),
                Completadas = g.Count(s => s.Estado == EstadoSolicitud.Resuelto),
            })
            .OrderByDescending(x => x.Asignadas)
            .ToListAsync(ct))
            .Select(x => new ResolutorConteo(x.Nombre, x.Asignadas, x.Completadas))
            .ToList();

        // 8. Por día: últimos 30 días
        //    s.CreadoEn.Date → CONVERT(date, CreadoEn) en SQL Server
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var porDia = (await q
            .Where(s => s.CreadoEn >= cutoff)
            .GroupBy(s => s.CreadoEn.Date)
            .Select(g => new { Fecha = g.Key, Count = g.Count() })
            .OrderBy(x => x.Fecha)
            .ToListAsync(ct))
            .Select(x => new FechaConteo(x.Fecha, x.Count))
            .ToList();

        return new SolicitudStatsData(
            porEstado, porBu, porCategoria, porPrioridad,
            Math.Round(tiempoPromedio, 1),
            sinAsignar, porResolutor, porDia);
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

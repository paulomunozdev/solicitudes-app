using Application.Common.Interfaces;
using Domain.Entities;
using Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class AppDbContext(DbContextOptions<AppDbContext> options, ICurrentUserService currentUser)
    : DbContext(options), IAppDbContext

{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Solicitud> Solicitudes => Set<Solicitud>();
    public DbSet<Comentario> Comentarios => Set<Comentario>();
    public DbSet<ArchivoAdjunto> Archivos => Set<ArchivoAdjunto>();
    public DbSet<Categoria> Categorias => Set<Categoria>();
    public DbSet<UnidadNegocio> UnidadesNegocio => Set<UnidadNegocio>();
    public DbSet<AuditoriaEntry> Auditoria => Set<AuditoriaEntry>();
    public DbSet<SlaConfig> SlaConfigs => Set<SlaConfig>();

    // IAppDbContext
    Task<List<UnidadNegocio>> IAppDbContext.GetUnidadesNegocioAsync(bool soloActivas, CancellationToken ct)
    {
        var q = Set<UnidadNegocio>().AsQueryable();
        if (soloActivas) q = q.Where(u => u.Activo);
        return q.OrderBy(u => u.Nombre).ToListAsync(ct);
    }
    Task<UnidadNegocio?> IAppDbContext.GetUnidadNegocioByIdAsync(Guid id, CancellationToken ct)
        => Set<UnidadNegocio>().FirstOrDefaultAsync(u => u.Id == id, ct);
    void IAppDbContext.AddUnidadNegocio(UnidadNegocio u) => Set<UnidadNegocio>().Add(u);

    Task<List<Categoria>> IAppDbContext.GetCategoriasAsync(bool soloActivas, CancellationToken ct)
    {
        var q = Set<Categoria>().AsQueryable();
        if (soloActivas) q = q.Where(c => c.Activo);
        return q.OrderBy(c => c.Nombre).ToListAsync(ct);
    }
    Task<Categoria?> IAppDbContext.GetCategoriaByIdAsync(Guid id, CancellationToken ct)
        => Set<Categoria>().FirstOrDefaultAsync(c => c.Id == id, ct);
    void IAppDbContext.AddCategoria(Categoria c) => Set<Categoria>().Add(c);

    Task<List<SlaConfig>> IAppDbContext.GetSlaConfigsAsync(CancellationToken ct)
        => Set<SlaConfig>().OrderBy(s => s.Prioridad).ToListAsync(ct);

    async Task IAppDbContext.UpsertSlaConfigAsync(PrioridadSolicitud prioridad, int horas, CancellationToken ct)
    {
        var existing = await Set<SlaConfig>()
            .FirstOrDefaultAsync(s => s.Prioridad == prioridad, ct);

        if (existing is not null)
            existing.Horas = horas;
        else
            Set<SlaConfig>().Add(new SlaConfig { TenantId = currentUser.TenantId, Prioridad = prioridad, Horas = horas });
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Tenant
        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(200);
            e.Property(x => x.Plan).HasMaxLength(50);
        });

        // Usuario
        modelBuilder.Entity<Usuario>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Email).IsRequired().HasMaxLength(256);
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(200);
            e.Property(x => x.ExternalId).HasMaxLength(256);
            e.Property(x => x.Foto).HasMaxLength(500);
            e.Property(x => x.UnidadNegocioNombre).HasMaxLength(100);
            e.Property(x => x.UltimoAcceso).HasDefaultValueSql("GETUTCDATE()");
            e.HasOne(x => x.Tenant).WithMany(t => t.Usuarios).HasForeignKey(x => x.TenantId);
        });

        // Solicitud
        modelBuilder.Entity<Solicitud>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Titulo).IsRequired().HasMaxLength(200);
            e.Property(x => x.Descripcion).IsRequired().HasMaxLength(5000);
            e.Property(x => x.Categoria).HasMaxLength(100);
            e.HasOne(x => x.Tenant).WithMany(t => t.Solicitudes).HasForeignKey(x => x.TenantId);
            e.HasOne(x => x.UsuarioCreador).WithMany().HasForeignKey(x => x.UsuarioCreadorId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(x => x.ConsultorAsignado).WithMany().HasForeignKey(x => x.ConsultorAsignadoId).OnDelete(DeleteBehavior.Restrict);
            e.Ignore(x => x.DomainEvents);

            // Global query filter: cada query filtra automáticamente por TenantId
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // Comentario
        modelBuilder.Entity<Comentario>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.Texto).IsRequired().HasMaxLength(5000);
            e.HasOne(x => x.Solicitud).WithMany(s => s.Comentarios).HasForeignKey(x => x.SolicitudId);
            e.HasOne(x => x.Usuario).WithMany().HasForeignKey(x => x.UsuarioId).OnDelete(DeleteBehavior.Restrict);
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // UnidadNegocio
        modelBuilder.Entity<UnidadNegocio>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(100);
            e.Property(x => x.Color).HasMaxLength(20);
            e.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // Categoria
        modelBuilder.Entity<Categoria>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Nombre).IsRequired().HasMaxLength(100);
            e.Property(x => x.Color).HasMaxLength(20);
            e.HasOne<Tenant>().WithMany().HasForeignKey(x => x.TenantId);
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // ArchivoAdjunto
        modelBuilder.Entity<ArchivoAdjunto>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever(); // Guid asignado en BaseEntity, no por la BD
            e.Property(x => x.NombreArchivo).IsRequired().HasMaxLength(500);
            e.Property(x => x.BlobUrl).IsRequired().HasMaxLength(1000);
            e.Property(x => x.ContentType).HasMaxLength(100);
            e.HasOne(x => x.Solicitud).WithMany(s => s.Archivos).HasForeignKey(x => x.SolicitudId);
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // SlaConfig — una fila por (TenantId, Prioridad)
        modelBuilder.Entity<SlaConfig>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.HasIndex(x => new { x.TenantId, x.Prioridad }).IsUnique();
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });

        // AuditoriaEntry — never deleted, no global filter (admins pueden ver todo el historial)
        modelBuilder.Entity<AuditoriaEntry>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).ValueGeneratedNever();
            e.Property(x => x.EntidadTipo).IsRequired().HasMaxLength(100);
            e.Property(x => x.Accion).IsRequired().HasMaxLength(100);
            e.Property(x => x.UsuarioNombre).IsRequired().HasMaxLength(200);
            e.Property(x => x.Detalle).HasMaxLength(2000);
            e.HasQueryFilter(x => x.TenantId == currentUser.TenantId);
        });
    }
}

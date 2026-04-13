using Domain.Enums;
using Domain.Events;

namespace Domain.Entities;

public class Solicitud : TenantEntity
{
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public EstadoSolicitud Estado { get; set; } = EstadoSolicitud.Pendiente;
    public PrioridadSolicitud Prioridad { get; set; } = PrioridadSolicitud.Media;
    public string? Categoria { get; set; }
    public string? UnidadNegocio { get; set; }
    public string? NombreSolicitante { get; set; }
    public DateTime? FechaLimite { get; set; }

    public Guid UsuarioCreadorId { get; set; }
    public Guid? ConsultorAsignadoId { get; set; }

    public Usuario UsuarioCreador { get; set; } = null!;
    public Usuario? ConsultorAsignado { get; set; }
    public Tenant Tenant { get; set; } = null!;

    public ICollection<Comentario> Comentarios { get; set; } = [];
    public ICollection<ArchivoAdjunto> Archivos { get; set; } = [];

    private readonly List<IDomainEvent> _domainEvents = [];
    public IReadOnlyList<IDomainEvent> DomainEvents => _domainEvents.AsReadOnly();

    public void CambiarEstado(EstadoSolicitud nuevoEstado, Guid usuarioId)
    {
        var estadoAnterior = Estado;
        Estado = nuevoEstado;
        ActualizadoEn = DateTime.UtcNow;
        _domainEvents.Add(new EstadoCambiadoEvent(Id, TenantId, estadoAnterior, nuevoEstado, usuarioId));
    }

    public void AsignarConsultor(Guid consultorId)
    {
        ConsultorAsignadoId = consultorId;
        ActualizadoEn = DateTime.UtcNow;
    }

    public void ClearDomainEvents() => _domainEvents.Clear();
}

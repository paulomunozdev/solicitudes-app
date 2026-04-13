namespace Domain.Entities;

/// <summary>Registro inmutable de auditoría. Nunca se modifica, solo se inserta.</summary>
public class AuditoriaEntry : TenantEntity
{
    public string EntidadTipo { get; set; } = string.Empty;   // "Solicitud", "Comentario", etc.
    public Guid EntidadId { get; set; }
    public string Accion { get; set; } = string.Empty;        // "CambioEstado", "Reasignacion", "NuevoComentario", "NuevoArchivo", etc.
    public Guid UsuarioId { get; set; }
    public string UsuarioNombre { get; set; } = string.Empty;
    public string? Detalle { get; set; }                       // JSON o texto libre con contexto extra
}

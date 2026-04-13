using Domain.Enums;

namespace Domain.Entities;

public class Usuario : TenantEntity
{
    public string ExternalId { get; set; } = string.Empty; // Google sub
    public string Email { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public string? Foto { get; set; }
    public RolUsuario Rol { get; set; } = RolUsuario.Solicitante;
    public string? UnidadNegocioNombre { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime UltimoAcceso { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;
}

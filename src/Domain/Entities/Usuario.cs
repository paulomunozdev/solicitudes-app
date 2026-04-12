using Domain.Enums;

namespace Domain.Entities;

public class Usuario : TenantEntity
{
    public string ExternalId { get; set; } = string.Empty; // Azure AD B2C sub
    public string Email { get; set; } = string.Empty;
    public string Nombre { get; set; } = string.Empty;
    public RolUsuario Rol { get; set; } = RolUsuario.Cliente;
    public bool Activo { get; set; } = true;

    public Tenant Tenant { get; set; } = null!;
}

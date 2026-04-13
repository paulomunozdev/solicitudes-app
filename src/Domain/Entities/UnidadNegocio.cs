namespace Domain.Entities;

public class UnidadNegocio : TenantEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Color { get; set; } = "#64748b";
    public bool Activo { get; set; } = true;
}

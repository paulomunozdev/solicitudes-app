namespace Domain.Entities;

public class Tenant : BaseEntity
{
    public string Nombre { get; set; } = string.Empty;
    public string Plan { get; set; } = "Basic";
    public bool Activo { get; set; } = true;

    public ICollection<Usuario> Usuarios { get; set; } = [];
    public ICollection<Solicitud> Solicitudes { get; set; } = [];
}

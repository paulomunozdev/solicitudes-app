namespace Domain.Entities;

public class Comentario : TenantEntity
{
    public Guid SolicitudId { get; set; }
    public Guid UsuarioId { get; set; }
    public string Texto { get; set; } = string.Empty;
    public bool EsInterno { get; set; } // visible solo para consultores

    public Solicitud Solicitud { get; set; } = null!;
    public Usuario Usuario { get; set; } = null!;
}

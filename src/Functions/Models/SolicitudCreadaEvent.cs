namespace Functions.Models;

public class SolicitudCreadaEvent
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime OcurridoEn { get; set; }
    public Guid SolicitudId { get; set; }
    public Guid TenantId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public string UsuarioCreadorNombre { get; set; } = string.Empty;
    public int Prioridad { get; set; }
}

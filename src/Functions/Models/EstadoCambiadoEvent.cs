namespace Functions.Models;

public class EstadoCambiadoEvent
{
    public Guid EventId { get; set; }
    public string EventType { get; set; } = string.Empty;
    public DateTime OcurridoEn { get; set; }
    public Guid SolicitudId { get; set; }
    public Guid TenantId { get; set; }
    public string Titulo { get; set; } = string.Empty;
    public string UsuarioCreadorNombre { get; set; } = string.Empty;
    public string? UsuarioCreadorEmail { get; set; }
    public int EstadoAnterior { get; set; }
    public int EstadoNuevo { get; set; }
    public Guid UsuarioId { get; set; }
}

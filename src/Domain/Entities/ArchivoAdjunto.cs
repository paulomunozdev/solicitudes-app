namespace Domain.Entities;

public class ArchivoAdjunto : TenantEntity
{
    public Guid SolicitudId { get; set; }
    public string NombreArchivo { get; set; } = string.Empty;
    public string BlobUrl { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long TamanoBytes { get; set; }
    public Guid SubidoPorId { get; set; }

    public Solicitud Solicitud { get; set; } = null!;
}

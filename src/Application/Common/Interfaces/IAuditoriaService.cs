namespace Application.Common.Interfaces;

public interface IAuditoriaService
{
    /// <summary>Registra una entrada de auditoría asociada a un tenant y usuario.</summary>
    Task RegistrarAsync(
        Guid tenantId,
        string entidadTipo,
        Guid entidadId,
        string accion,
        Guid usuarioId,
        string usuarioNombre,
        string? detalle = null,
        CancellationToken ct = default);
}

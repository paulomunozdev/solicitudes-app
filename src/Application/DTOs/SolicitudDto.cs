using Domain.Enums;

namespace Application.DTOs;

public record PagedResult<T>(
    IEnumerable<T> Items,
    int Total,
    int Page,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling((double)Total / PageSize);
}

public record SolicitudesStatsDto(
    int Total,
    int Pendientes,
    int EnRevision,
    int EnDesarrollo,
    int Completadas,
    int Rechazadas,
    IEnumerable<SolicitudesPorDiaDto> PorDia,
    IEnumerable<ConteoItemDto> PorBu,
    IEnumerable<ConteoItemDto> PorCategoria,
    IEnumerable<ConteoItemDto> PorPrioridad,
    double TiempoPromedioResolucionDias,
    int SinAsignar,
    IEnumerable<ResolutorStatsDto> PorResolutor
);

public record SolicitudesPorDiaDto(string Fecha, int Cantidad);
public record ConteoItemDto(string Nombre, int Cantidad);
public record ResolutorStatsDto(string Nombre, int Asignadas, int Completadas);

public record SolicitudDto(
    Guid Id,
    string Titulo,
    string Descripcion,
    EstadoSolicitud Estado,
    string EstadoNombre,
    PrioridadSolicitud Prioridad,
    string PrioridadNombre,
    string? Categoria,
    string? UnidadNegocio,
    string? NombreSolicitante,
    DateTime? FechaLimite,
    Guid UsuarioCreadorId,
    string UsuarioCreadorNombre,
    Guid? ConsultorAsignadoId,
    string? ConsultorAsignadoNombre,
    DateTime CreadoEn,
    DateTime ActualizadoEn,
    int TotalComentarios
);

public record ComentarioDto(
    Guid Id,
    string Texto,
    bool EsInterno,
    string UsuarioNombre,
    DateTime CreadoEn
);

public record CrearSolicitudRequest(
    string Titulo,
    string Descripcion,
    PrioridadSolicitud Prioridad,
    string? Categoria,
    string? UnidadNegocio,
    string? NombreSolicitante,
    DateTime? FechaLimite
);

public record ActualizarEstadoRequest(
    EstadoSolicitud NuevoEstado
);

public record AgregarComentarioRequest(
    string Texto,
    bool EsInterno
);

public record CategoriaDto(Guid Id, string Nombre, string Color, bool Activo);
public record CrearCategoriaRequest(string Nombre, string Color);
public record ActualizarCategoriaRequest(string Nombre, string Color, bool Activo);

public record UnidadNegocioDto(Guid Id, string Nombre, string Color, bool Activo);
public record CrearUnidadNegocioRequest(string Nombre, string Color);
public record ActualizarUnidadNegocioRequest(string Nombre, string Color, bool Activo);

public record UsuarioDto(
    Guid Id,
    string Nombre,
    string Email,
    string? Foto,
    int Rol,
    string RolNombre,
    string? UnidadNegocioNombre,
    bool Activo,
    DateTime UltimoAcceso
);

public record ActualizarUsuarioRequest(int Rol, string? UnidadNegocioNombre);

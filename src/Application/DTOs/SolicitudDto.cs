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
    IEnumerable<SolicitudesPorDiaDto> PorDia
);

public record SolicitudesPorDiaDto(string Fecha, int Cantidad);

public record SolicitudDto(
    Guid Id,
    string Titulo,
    string Descripcion,
    EstadoSolicitud Estado,
    string EstadoNombre,
    PrioridadSolicitud Prioridad,
    string PrioridadNombre,
    string? Categoria,
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

using Domain.Enums;

namespace Application.DTOs;

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

namespace Domain.Enums;

public enum EstadoSolicitud
{
    Pendiente = 1,
    EnRevision = 2,
    EnProgreso = 3,
    Resuelto = 4,
    Cerrado = 5,
    Cancelado = 6
}

public enum PrioridadSolicitud
{
    Baja = 1,
    Media = 2,
    Alta = 3,
    Critica = 4
}

public enum RolUsuario
{
    Pendiente    = 0,   // Registrado, esperando aprobación
    Solicitante  = 1,   // Puede crear y ver sus propias solicitudes / BU
    Gestor       = 2,   // Ve y gestiona todas las solicitudes del tenant
    Admin        = 3,   // Control total + panel de administración
    Observador   = 4,   // Solo lectura de las solicitudes de su BU
}

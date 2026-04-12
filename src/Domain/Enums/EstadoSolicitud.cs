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
    Cliente = 1,
    Consultor = 2,
    Admin = 3
}

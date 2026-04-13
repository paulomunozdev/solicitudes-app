using Domain.Enums;

namespace Application.Common.Interfaces;

public interface ICurrentUserService
{
    Guid UserId { get; }
    Guid TenantId { get; }
    string Email { get; }
    string UserName { get; }
    RolUsuario Rol { get; }
    string? UnidadNegocioNombre { get; }
    bool IsAuthenticated { get; }
}

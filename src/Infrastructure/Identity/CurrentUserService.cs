using Application.Common.Interfaces;
using Domain.Enums;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace Infrastructure.Identity;

public class CurrentUserService(IHttpContextAccessor httpContextAccessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => httpContextAccessor.HttpContext?.User;

    public Guid UserId => Guid.TryParse(User?.FindFirst("userId")?.Value, out var id) ? id : Guid.Empty;

    public Guid TenantId => Guid.TryParse(User?.FindFirst("tenantId")?.Value, out var id) ? id : Guid.Empty;

    public string Email => User?.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty;

    public string UserName => User?.FindFirst(ClaimTypes.Name)?.Value ?? Email;

    public RolUsuario Rol
    {
        get
        {
            var val = User?.FindFirst("rol")?.Value;
            return int.TryParse(val, out var i) && Enum.IsDefined(typeof(RolUsuario), i)
                ? (RolUsuario)i
                : RolUsuario.Solicitante;
        }
    }

    public string? UnidadNegocioNombre => User?.FindFirst("unidadNegocio")?.Value;

    public bool IsAuthenticated => User?.Identity?.IsAuthenticated ?? false;
}

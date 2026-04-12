using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace API;

/// <summary>
/// Handler de autenticación solo para desarrollo.
/// Inyecta un usuario y tenant fijo para poder probar sin Azure AD B2C.
/// </summary>
public class DevBypassHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    // IDs fijos para desarrollo — se usarán en todas las requests
    public static readonly Guid DevUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");
    public static readonly Guid DevTenantId = Guid.Parse("00000000-0000-0000-0000-000000000002");

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var claims = new[]
        {
            new Claim("userId", DevUserId.ToString()),
            new Claim("tenantId", DevTenantId.ToString()),
            new Claim(ClaimTypes.Email, "dev@solicitudesapp.com"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim(ClaimTypes.Name, "Dev User")
        };

        var identity = new ClaimsIdentity(claims, "DevBypass");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "DevBypass");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

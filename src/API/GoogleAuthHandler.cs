using Google.Apis.Auth;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Text.Encodings.Web;

namespace API;

/// <summary>
/// Valida Google ID Tokens (emitidos por Google Identity Services) y convierte
/// el payload en claims compatibles con ICurrentUserService.
/// </summary>
public class GoogleAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.ToString();
        if (!authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            return AuthenticateResult.Fail("No Bearer token");

        var idToken = authHeader["Bearer ".Length..].Trim();

        try
        {
            var clientId = configuration["Google:ClientId"]!;
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken,
                new GoogleJsonWebSignature.ValidationSettings { Audience = [clientId] });

            // Derivar IDs determinísticos desde los datos de Google
            var userId = DeterministicGuid(payload.Subject);
            var domain = payload.Email.Split('@').Last().ToLowerInvariant();
            var tenantId = DeterministicGuid(domain);

            var claims = new[]
            {
                new Claim("userId",        userId.ToString()),
                new Claim("tenantId",      tenantId.ToString()),
                new Claim(ClaimTypes.Email, payload.Email),
                new Claim(ClaimTypes.Name,  payload.Name),
                new Claim(ClaimTypes.Role,  "User"),
            };

            var identity = new ClaimsIdentity(claims, "Google");
            return AuthenticateResult.Success(
                new AuthenticationTicket(new ClaimsPrincipal(identity), "Google"));
        }
        catch (Exception ex)
        {
            return AuthenticateResult.Fail($"Invalid Google token: {ex.Message}");
        }
    }

    /// <summary>Genera un Guid determinístico a partir de un string usando SHA-256.</summary>
    private static Guid DeterministicGuid(string input)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return new Guid(hash[..16]);
    }
}

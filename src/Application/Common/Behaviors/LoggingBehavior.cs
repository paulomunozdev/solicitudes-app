using Application.Common.Interfaces;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Application.Common.Behaviors;

public class LoggingBehavior<TRequest, TResponse>(
    ILogger<LoggingBehavior<TRequest, TResponse>> logger,
    ICurrentUserService currentUser)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken ct)
    {
        var requestName = typeof(TRequest).Name;
        var userId      = currentUser.UserId == Guid.Empty ? "anon" : currentUser.UserId.ToString();
        var tenantId    = currentUser.TenantId == Guid.Empty ? "-" : currentUser.TenantId.ToString();

        logger.LogInformation("Ejecutando {RequestName} | user={UserId} tenant={TenantId}",
            requestName, userId, tenantId);

        var response = await next();

        logger.LogInformation("Completado {RequestName} | user={UserId}",
            requestName, userId);

        return response;
    }
}

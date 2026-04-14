using Application.Sla;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/admin/sla")]
public class SlaController(IMediator mediator) : ControllerBase
{
    /// <summary>Obtiene la configuración de SLA del tenant (horas por prioridad).</summary>
    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        var result = await mediator.Send(new GetSlaConfigsQuery(), ct);
        return Ok(result);
    }

    /// <summary>Actualiza las horas de SLA para una prioridad. Solo Admin.</summary>
    [HttpPut("{prioridad}")]
    public async Task<IActionResult> Update(PrioridadSolicitud prioridad, [FromBody] ActualizarSlaRequest req, CancellationToken ct)
    {
        await mediator.Send(new ActualizarSlaCommand(prioridad, req.Horas), ct);
        return NoContent();
    }
}

public record ActualizarSlaRequest(int Horas);

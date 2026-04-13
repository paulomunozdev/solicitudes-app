using Application.DTOs;
using Application.UnidadesNegocio;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/unidades-negocio")]
public class UnidadesNegocioController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivas = false, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetUnidadesNegocioQuery(soloActivas), ct);
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CrearUnidadNegocioRequest req, CancellationToken ct)
    {
        var id = await mediator.Send(new CrearUnidadNegocioCommand(req.Nombre, req.Color), ct);
        return Ok(new { id });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ActualizarUnidadNegocioRequest req, CancellationToken ct)
    {
        await mediator.Send(new ActualizarUnidadNegocioCommand(id, req.Nombre, req.Color, req.Activo), ct);
        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EliminarUnidadNegocioCommand(id), ct);
        return NoContent();
    }
}

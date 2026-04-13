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
    /// <summary>Lista todas las unidades de negocio del tenant. Accesible a todos los roles autenticados.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivas = false, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetUnidadesNegocioQuery(soloActivas), ct);
        return Ok(result);
    }

    /// <summary>Crea una nueva unidad de negocio. Solo Admin y Gestor.</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Create([FromBody] CrearUnidadNegocioRequest req, CancellationToken ct)
    {
        var id = await mediator.Send(new CrearUnidadNegocioCommand(req.Nombre, req.Color), ct);
        return Ok(new { id });
    }

    /// <summary>Actualiza nombre, color y estado activo de una unidad de negocio. Solo Admin y Gestor.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ActualizarUnidadNegocioRequest req, CancellationToken ct)
    {
        await mediator.Send(new ActualizarUnidadNegocioCommand(id, req.Nombre, req.Color, req.Activo), ct);
        return NoContent();
    }

    /// <summary>Desactiva (soft delete) una unidad de negocio. Solo Admin y Gestor.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EliminarUnidadNegocioCommand(id), ct);
        return NoContent();
    }
}

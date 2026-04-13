using Application.Categorias;
using Application.DTOs;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CategoriasController(IMediator mediator) : ControllerBase
{
    /// <summary>Lista todas las categorías del tenant. Accesible a todos los roles autenticados.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool soloActivas = false, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetCategoriasQuery(soloActivas), ct);
        return Ok(result);
    }

    /// <summary>Crea una nueva categoría. Solo Admin y Gestor.</summary>
    [HttpPost]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Create([FromBody] CrearCategoriaRequest req, CancellationToken ct)
    {
        var id = await mediator.Send(new CrearCategoriaCommand(req.Nombre, req.Color), ct);
        return Ok(new { id });
    }

    /// <summary>Actualiza nombre, color y estado activo de una categoría. Solo Admin y Gestor.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Update(Guid id, [FromBody] ActualizarCategoriaRequest req, CancellationToken ct)
    {
        await mediator.Send(new ActualizarCategoriaCommand(id, req.Nombre, req.Color, req.Activo), ct);
        return NoContent();
    }

    /// <summary>Desactiva (soft delete) una categoría. Solo Admin y Gestor.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOGestor")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await mediator.Send(new EliminarCategoriaCommand(id), ct);
        return NoContent();
    }
}

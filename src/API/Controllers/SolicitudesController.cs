using Application.DTOs;
using Application.Solicitudes.Commands;
using Application.Solicitudes.Queries;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SolicitudesController(IMediator mediator) : ControllerBase
{
    /// <summary>Obtiene solicitudes paginadas con filtros opcionales.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] EstadoSolicitud? estado,
        [FromQuery] PrioridadSolicitud? prioridad,
        [FromQuery] string? busqueda,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetSolicitudesQuery(estado, prioridad, busqueda, page, pageSize), ct);
        return Ok(result);
    }

    /// <summary>Retorna estadísticas agregadas del tenant.</summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken ct)
    {
        var result = await mediator.Send(new GetSolicitudesStatsQuery(), ct);
        return Ok(result);
    }

    /// <summary>Obtiene una solicitud por Id.</summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetSolicitudByIdQuery(id), ct);
        return Ok(result);
    }

    /// <summary>Crea una nueva solicitud. Responde 202 inmediatamente y procesa en background.</summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CrearSolicitudRequest req, CancellationToken ct)
    {
        var id = await mediator.Send(new CrearSolicitudCommand(
            req.Titulo, req.Descripcion, req.Prioridad, req.Categoria, req.FechaLimite
        ), ct);

        return AcceptedAtAction(nameof(GetById), new { id }, new { id });
    }

    /// <summary>Actualiza el estado de una solicitud. Solo Consultores y Admins.</summary>
    [HttpPatch("{id:guid}/estado")]
    [Authorize(Roles = "Consultor,Admin")]
    public async Task<IActionResult> UpdateEstado(Guid id, [FromBody] ActualizarEstadoRequest req, CancellationToken ct)
    {
        await mediator.Send(new ActualizarEstadoCommand(id, req.NuevoEstado), ct);
        return NoContent();
    }

    /// <summary>Obtiene los comentarios de una solicitud.</summary>
    [HttpGet("{id:guid}/comentarios")]
    public async Task<IActionResult> GetComentarios(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetComentariosQuery(id), ct);
        return Ok(result);
    }

    /// <summary>Agrega un comentario a una solicitud.</summary>
    [HttpPost("{id:guid}/comentarios")]
    public async Task<IActionResult> AgregarComentario(Guid id, [FromBody] AgregarComentarioRequest req, CancellationToken ct)
    {
        var comentarioId = await mediator.Send(new AgregarComentarioCommand(id, req.Texto, req.EsInterno), ct);
        return Ok(new { id = comentarioId });
    }
}

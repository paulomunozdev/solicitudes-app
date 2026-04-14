using Application.Common.Interfaces;
using Application.DTOs;
using Application.Solicitudes.Commands;
using Application.Solicitudes.Queries;
using ClosedXML.Excel;
using Domain.Enums;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SolicitudesController(IMediator mediator, ICurrentUserService currentUser) : ControllerBase
{
    /// <summary>Obtiene solicitudes paginadas con filtros y vistas opcionales.</summary>
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] EstadoSolicitud? estado,
        [FromQuery] PrioridadSolicitud? prioridad,
        [FromQuery] string? busqueda,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool soloMias = false,
        [FromQuery] bool soloActivas = false,
        [FromQuery] bool soloCerradas = false,
        [FromQuery] bool soloAsignadaAMi = false,
        CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetSolicitudesQuery(
            estado, prioridad, busqueda, page, pageSize,
            soloMias, soloActivas, soloCerradas, soloAsignadaAMi), ct);
        return Ok(result);
    }

    /// <summary>Exporta solicitudes filtradas a Excel (.xlsx).</summary>
    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] EstadoSolicitud? estado,
        [FromQuery] PrioridadSolicitud? prioridad,
        [FromQuery] string? busqueda,
        [FromQuery] bool soloMias = false,
        [FromQuery] bool soloActivas = false,
        [FromQuery] bool soloCerradas = false,
        CancellationToken ct = default)
    {
        // Carga hasta 1000 registros para el export (sin paginación)
        var result = await mediator.Send(new GetSolicitudesQuery(
            estado, prioridad, busqueda, Page: 1, PageSize: 1000,
            soloMias, soloActivas, soloCerradas), ct);

        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Solicitudes");

        // Encabezados
        string[] headers = ["ID", "Título", "Estado", "Prioridad", "Categoría",
                             "Unidad de Negocio", "Solicitante", "Asignado a",
                             "Fecha Límite", "Creado", "Actualizado", "Comentarios"];

        for (int i = 0; i < headers.Length; i++)
        {
            ws.Cell(1, i + 1).Value = headers[i];
            ws.Cell(1, i + 1).Style.Font.Bold = true;
            ws.Cell(1, i + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#0f172a");
            ws.Cell(1, i + 1).Style.Font.FontColor = XLColor.White;
        }

        // Filas
        int row = 2;
        foreach (var s in result.Items)
        {
            ws.Cell(row, 1).Value = s.Id.ToString();
            ws.Cell(row, 2).Value = s.Titulo;
            ws.Cell(row, 3).Value = s.EstadoNombre;
            ws.Cell(row, 4).Value = s.PrioridadNombre;
            ws.Cell(row, 5).Value = s.Categoria ?? "";
            ws.Cell(row, 6).Value = s.UnidadNegocio ?? "";
            ws.Cell(row, 7).Value = s.NombreSolicitante ?? s.UsuarioCreadorNombre;
            ws.Cell(row, 8).Value = s.ConsultorAsignadoNombre ?? "Sin asignar";
            ws.Cell(row, 9).Value = s.FechaLimite.HasValue ? s.FechaLimite.Value.ToString("dd/MM/yyyy") : "";
            ws.Cell(row, 10).Value = s.CreadoEn.ToString("dd/MM/yyyy HH:mm");
            ws.Cell(row, 11).Value = s.ActualizadoEn.ToString("dd/MM/yyyy HH:mm");
            ws.Cell(row, 12).Value = s.TotalComentarios;

            // Fila alternada
            if (row % 2 == 0)
                ws.Row(row).Style.Fill.BackgroundColor = XLColor.FromHtml("#f8fafc");

            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        stream.Seek(0, SeekOrigin.Begin);

        var fileName = $"solicitudes_{DateTime.UtcNow:yyyyMMdd_HHmm}.xlsx";
        return File(stream.ToArray(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            fileName);
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
            req.Titulo, req.Descripcion, req.Prioridad, req.Categoria,
            req.UnidadNegocio, req.NombreSolicitante
        ), ct);

        return AcceptedAtAction(nameof(GetById), new { id }, new { id });
    }

    /// <summary>Actualiza el estado de una solicitud. Solo Gestor y Admin.</summary>
    [HttpPatch("{id:guid}/estado")]
    public async Task<IActionResult> UpdateEstado(Guid id, [FromBody] ActualizarEstadoRequest req, CancellationToken ct)
    {
        if (currentUser.Rol != RolUsuario.Gestor && currentUser.Rol != RolUsuario.Admin)
            return Forbid();
        await mediator.Send(new ActualizarEstadoCommand(id, req.NuevoEstado), ct);
        return NoContent();
    }

    /// <summary>Reasigna el consultor de una solicitud. Solo Gestor y Admin.</summary>
    [HttpPatch("{id:guid}/reasignar")]
    public async Task<IActionResult> Reasignar(Guid id, [FromBody] ReasignarSolicitudRequest req, CancellationToken ct)
    {
        await mediator.Send(new ReasignarSolicitudCommand(id, req.ConsultorId), ct);
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

    /// <summary>Lista los archivos adjuntos de una solicitud.</summary>
    [HttpGet("{id:guid}/archivos")]
    public async Task<IActionResult> GetArchivos(Guid id, CancellationToken ct)
    {
        var result = await mediator.Send(new GetArchivosQuery(id), ct);
        return Ok(result);
    }

    /// <summary>Sube un archivo adjunto a una solicitud (máx 10 MB).</summary>
    [HttpPost("{id:guid}/archivos")]
    [RequestSizeLimit(11 * 1024 * 1024)] // 11 MB — el validator rechaza > 10 MB
    public async Task<IActionResult> SubirArchivo(Guid id, IFormFile archivo, CancellationToken ct)
    {
        if (archivo is null || archivo.Length == 0)
            return BadRequest("No se recibió ningún archivo.");

        using var stream = archivo.OpenReadStream();
        var archivoId = await mediator.Send(new SubirArchivoCommand(
            id,
            archivo.FileName,
            archivo.ContentType,
            archivo.Length,
            stream), ct);

        return Ok(new { id = archivoId });
    }

    /// <summary>Elimina un archivo adjunto de una solicitud.</summary>
    [HttpDelete("{id:guid}/archivos/{archivoId:guid}")]
    public async Task<IActionResult> EliminarArchivo(Guid id, Guid archivoId, CancellationToken ct)
    {
        await mediator.Send(new EliminarArchivoCommand(id, archivoId), ct);
        return NoContent();
    }
}

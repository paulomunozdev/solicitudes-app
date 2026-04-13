using Application.Common.Interfaces;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Storage;

public class BlobStorageService(IConfiguration config, ILogger<BlobStorageService> logger) : IBlobStorageService
{
    private readonly string _connectionString = config["AzureStorage:ConnectionString"]
        ?? throw new InvalidOperationException("AzureStorage:ConnectionString no está configurado.");

    private readonly string _containerName = config["AzureStorage:ContainerName"] ?? "solicitudes-archivos";

    public async Task<string> SubirArchivoAsync(string nombreArchivo, string contentType, Stream contenido, CancellationToken ct = default)
    {
        var containerClient = new BlobContainerClient(_connectionString, _containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.None, cancellationToken: ct);

        // Nombre único para evitar colisiones entre tenants / solicitudes
        var blobName = $"{Guid.NewGuid():N}_{nombreArchivo}";
        var blobClient = containerClient.GetBlobClient(blobName);

        await blobClient.UploadAsync(contenido, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);

        logger.LogInformation("Archivo subido: {BlobName} ({ContentType})", blobName, contentType);
        return blobClient.Uri.ToString();
    }

    public async Task EliminarArchivoAsync(string blobUrl, CancellationToken ct = default)
    {
        var uri = new Uri(blobUrl);
        var blobName = uri.Segments.Last();

        var containerClient = new BlobContainerClient(_connectionString, _containerName);
        var blobClient = containerClient.GetBlobClient(blobName);

        var deleted = await blobClient.DeleteIfExistsAsync(cancellationToken: ct);
        if (deleted)
            logger.LogInformation("Archivo eliminado del blob: {BlobName}", blobName);
        else
            logger.LogWarning("Intento de eliminar blob inexistente: {BlobUrl}", blobUrl);
    }
}

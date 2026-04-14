namespace Application.Common.Interfaces;

public interface IBlobStorageService
{
    /// <summary>Sube un archivo al contenedor de solicitudes y retorna la URL del blob.</summary>
    Task<string> SubirArchivoAsync(string nombreArchivo, string contentType, Stream contenido, CancellationToken ct = default);

    /// <summary>Elimina un archivo por su URL de blob.</summary>
    Task EliminarArchivoAsync(string blobUrl, CancellationToken ct = default);

    /// <summary>Genera una URL SAS temporal (válida por el tiempo indicado) para descargar un blob privado.</summary>
    string GenerarUrlDescarga(string blobUrl, int minutosExpiracion = 60);
}

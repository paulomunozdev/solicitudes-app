using Application.Common.Interfaces;
using Application.Solicitudes.Commands;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Moq;

namespace Application.Tests.Solicitudes;

public class SubirArchivoTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ISolicitudRepository> _repo = new();
    private readonly Mock<IBlobStorageService> _blob = new();
    private readonly Mock<IAuditoriaService> _auditoria = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();

    private SubirArchivoHandler CreateHandler()
    {
        _uow.Setup(u => u.Solicitudes).Returns(_repo.Object);
        return new SubirArchivoHandler(_uow.Object, _blob.Object, _auditoria.Object, _currentUser.Object);
    }

    [Theory]
    [InlineData("documento.pdf",  "application/pdf")]        // PDF permitido
    [InlineData("imagen.png",     "image/png")]              // Imagen permitida
    [InlineData("reporte.xlsx",   "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")] // Excel
    public async Task SubirArchivo_TipoPermitido_RetornaId(string nombre, string contentType)
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var usuarioId = Guid.NewGuid();
        var blobUrl = "https://blob.core.windows.net/solicitudes-archivos/test.pdf";

        var solicitud = new Solicitud { Id = solicitudId, TenantId = tenantId, Estado = EstadoSolicitud.Pendiente };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _blob.Setup(b => b.SubirArchivoAsync(nombre, contentType, It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync(blobUrl);
        _currentUser.Setup(u => u.UserId).Returns(usuarioId);
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);
        _currentUser.Setup(u => u.UserName).Returns("Test");

        var handler = CreateHandler();

        // Act
        var result = await handler.Handle(
            new SubirArchivoCommand(solicitudId, nombre, contentType, 1024, Stream.Null),
            CancellationToken.None);

        // Assert
        Assert.NotEqual(Guid.Empty, result);
        Assert.Single(solicitud.Archivos);
        Assert.Equal(blobUrl, solicitud.Archivos.First().BlobUrl);
    }

    [Theory]
    [InlineData(EstadoSolicitud.Resuelto)]  // Cerrada: no acepta archivos
    [InlineData(EstadoSolicitud.Cancelado)] // Cancelada: no acepta archivos
    [InlineData(EstadoSolicitud.Cerrado)]   // Cerrado: no acepta archivos
    public async Task SubirArchivo_SolicitudCerrada_LanzaInvalidOperation(EstadoSolicitud estado)
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var solicitud = new Solicitud { Id = solicitudId, Estado = estado };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _currentUser.Setup(u => u.TenantId).Returns(Guid.NewGuid());

        var handler = CreateHandler();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(
                new SubirArchivoCommand(solicitudId, "test.pdf", "application/pdf", 100, Stream.Null),
                CancellationToken.None));
    }
}

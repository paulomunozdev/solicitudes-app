using Application.Common.Interfaces;
using Application.Solicitudes.Commands;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Moq;

namespace Application.Tests.Solicitudes;

public class ActualizarEstadoTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ISolicitudRepository> _repo = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<IServiceBusPublisher> _publisher = new();
    private readonly Mock<IRealtimeNotifier> _realtime = new();
    private readonly Mock<IAuditoriaService> _auditoria = new();

    private ActualizarEstadoHandler CreateHandler()
    {
        _uow.Setup(u => u.Solicitudes).Returns(_repo.Object);
        return new ActualizarEstadoHandler(
            _uow.Object, _currentUser.Object,
            _publisher.Object, _realtime.Object, _auditoria.Object);
    }

    [Theory]
    [InlineData(EstadoSolicitud.Pendiente,  EstadoSolicitud.EnRevision)]  // flujo normal
    [InlineData(EstadoSolicitud.EnRevision, EstadoSolicitud.EnProgreso)]  // asignación a desarrollo
    [InlineData(EstadoSolicitud.EnProgreso, EstadoSolicitud.Resuelto)]    // cierre exitoso
    [InlineData(EstadoSolicitud.EnRevision, EstadoSolicitud.Cancelado)]   // rechazo en revisión
    public async Task CambiarEstado_TransicionValida_ActualizaEntidad(
        EstadoSolicitud estadoInicial, EstadoSolicitud estadoFinal)
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();
        var usuarioId = Guid.NewGuid();

        var solicitud = new Solicitud { Id = solicitudId, TenantId = tenantId, Estado = estadoInicial };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _currentUser.Setup(u => u.UserId).Returns(usuarioId);
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);
        _currentUser.Setup(u => u.UserName).Returns("Gestor");

        var handler = CreateHandler();

        // Act
        await handler.Handle(new ActualizarEstadoCommand(solicitudId, estadoFinal), CancellationToken.None);

        // Assert
        Assert.Equal(estadoFinal, solicitud.Estado);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task CambiarEstado_SolicitudInexistente_LanzaKeyNotFound()
    {
        // Arrange
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((Solicitud?)null);
        _currentUser.Setup(u => u.Rol).Returns(RolUsuario.Gestor);

        var handler = CreateHandler();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => handler.Handle(
                new ActualizarEstadoCommand(Guid.NewGuid(), EstadoSolicitud.Resuelto),
                CancellationToken.None));
    }

    [Fact]
    public async Task CambiarEstado_NotificaSignalRConEstadosCorrect()
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        var solicitud = new Solicitud
        {
            Id = solicitudId,
            TenantId = tenantId,
            Estado = EstadoSolicitud.Pendiente
        };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _currentUser.Setup(u => u.UserId).Returns(Guid.NewGuid());
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);
        _currentUser.Setup(u => u.UserName).Returns("Test");

        var handler = CreateHandler();

        // Act
        await handler.Handle(
            new ActualizarEstadoCommand(solicitudId, EstadoSolicitud.EnRevision),
            CancellationToken.None);

        // Assert: SignalR recibe el estado anterior y el nuevo
        _realtime.Verify(r => r.NotificarEstadoCambiadoAsync(
            tenantId, solicitudId,
            (int)EstadoSolicitud.Pendiente,
            (int)EstadoSolicitud.EnRevision,
            It.IsAny<CancellationToken>()), Times.Once);
    }
}

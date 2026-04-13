using Application.Common.Interfaces;
using Application.Solicitudes.Commands;
using Domain.Entities;
using Domain.Enums;
using Domain.Interfaces;
using Moq;

namespace Application.Tests.Solicitudes;

public class ReasignarSolicitudTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IAuditoriaService> _auditoria = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<ISolicitudRepository> _repo = new();

    private ReasignarSolicitudHandler CreateHandler()
    {
        _uow.Setup(u => u.Solicitudes).Returns(_repo.Object);
        return new ReasignarSolicitudHandler(_uow.Object, _auditoria.Object, _currentUser.Object);
    }

    [Fact]
    public async Task Reasignar_ComoGestor_AsignaConsultorCorrectamente()
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var consultorId = Guid.NewGuid();
        var gestorId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        var solicitud = new Solicitud { Id = solicitudId, TenantId = tenantId };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _currentUser.Setup(u => u.Rol).Returns(RolUsuario.Gestor);
        _currentUser.Setup(u => u.UserId).Returns(gestorId);
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);
        _currentUser.Setup(u => u.UserName).Returns("Gestor Test");

        var handler = CreateHandler();

        // Act
        await handler.Handle(new ReasignarSolicitudCommand(solicitudId, consultorId), CancellationToken.None);

        // Assert
        Assert.Equal(consultorId, solicitud.ConsultorAsignadoId);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
        _auditoria.Verify(a => a.RegistrarAsync(
            tenantId, "Solicitud", solicitudId, "Reasignacion",
            gestorId, "Gestor Test", It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Reasignar_DesasignarConNullConsultorId_FuncionaCorrectamente()
    {
        // Arrange
        var solicitudId = Guid.NewGuid();
        var tenantId = Guid.NewGuid();

        var solicitud = new Solicitud { Id = solicitudId, TenantId = tenantId, ConsultorAsignadoId = Guid.NewGuid() };
        _repo.Setup(r => r.GetByIdAsync(solicitudId, It.IsAny<CancellationToken>()))
             .ReturnsAsync(solicitud);
        _currentUser.Setup(u => u.Rol).Returns(RolUsuario.Admin);
        _currentUser.Setup(u => u.UserId).Returns(Guid.NewGuid());
        _currentUser.Setup(u => u.TenantId).Returns(tenantId);
        _currentUser.Setup(u => u.UserName).Returns("Admin");

        var handler = CreateHandler();

        // Act
        await handler.Handle(new ReasignarSolicitudCommand(solicitudId, null), CancellationToken.None);

        // Assert
        Assert.Null(solicitud.ConsultorAsignadoId);
    }

    [Theory]
    [InlineData(RolUsuario.Solicitante)] // Solicitante no puede reasignar
    [InlineData(RolUsuario.Observador)]  // Observador no puede reasignar
    public async Task Reasignar_SinPermiso_LanzaUnauthorized(RolUsuario rol)
    {
        // Arrange
        _currentUser.Setup(u => u.Rol).Returns(rol);
        var handler = CreateHandler();

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => handler.Handle(
                new ReasignarSolicitudCommand(Guid.NewGuid(), Guid.NewGuid()),
                CancellationToken.None));
    }

    [Fact]
    public async Task Reasignar_SolicitudInexistente_LanzaKeyNotFound()
    {
        // Arrange
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
             .ReturnsAsync((Solicitud?)null);
        _currentUser.Setup(u => u.Rol).Returns(RolUsuario.Gestor);

        var handler = CreateHandler();

        // Act & Assert
        await Assert.ThrowsAsync<KeyNotFoundException>(
            () => handler.Handle(
                new ReasignarSolicitudCommand(Guid.NewGuid(), Guid.NewGuid()),
                CancellationToken.None));
    }
}

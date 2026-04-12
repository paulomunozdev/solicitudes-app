namespace Domain.Entities;

public abstract class BaseEntity
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public DateTime CreadoEn { get; init; } = DateTime.UtcNow;
    public DateTime ActualizadoEn { get; set; } = DateTime.UtcNow;
}

public abstract class TenantEntity : BaseEntity
{
    public Guid TenantId { get; set; }
}

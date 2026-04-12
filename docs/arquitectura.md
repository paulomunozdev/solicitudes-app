# Arquitectura: Sistema de Gestión de Solicitudes Multi-cliente (SaaS)

## Visión General

Portal SaaS donde empresas (tenants) registran solicitudes de servicio y un equipo consultor las gestiona. Cada tenant ve únicamente sus propios datos (Row-Level Security). El procesamiento es asíncrono vía Azure Service Bus.

---

## Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTE (Browser)                         │
│                     Angular 19 (SPA)                            │
│         Auth (Azure AD B2C) · SignalR (tiempo real)             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Azure App Service                             │
│                   API .NET 8 (REST)                             │
│   Clean Architecture: Domain / Application / Infrastructure      │
│   CQRS + MediatR · EF Core · SignalR Hub                        │
└───────┬──────────────────┬───────────────────┬──────────────────┘
        │                  │                   │
        ▼                  ▼                   ▼
┌──────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  Azure SQL   │  │ Azure Service   │  │  Azure Blob      │
│  (Multi-     │  │ Bus             │  │  Storage         │
│  tenant RLS) │  │ Topic:          │  │  (adjuntos de    │
│              │  │ solicitudes     │  │   solicitudes)   │
│  - Tenants   │  │                 │  └──────────────────┘
│  - Users     │  │  ┌─ Subs:      │
│  - Solicitud │  │  │  procesam.  │
│  - Comenta.  │  │  └─ Subs:      │
│  - Archivos  │  │     notificac. │
└──────────────┘  └────────┬────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐   ┌─────────────────────────┐
│  Azure Function     │   │  Azure Function          │
│  SolicitudProcessor │   │  NotificationSender      │
│                     │   │                          │
│  - Valida datos     │   │  - Email (SendGrid)      │
│  - Asigna consultor │   │  - SignalR notify        │
│  - Actualiza estado │   │  - Dead Letter handling  │
│  - Publica evento   │   │                          │
└─────────────────────┘   └─────────────────────────┘
              │
              ▼
┌─────────────────────────┐
│  Application Insights   │
│  - Logs centralizados   │
│  - Alertas              │
│  - Performance          │
└─────────────────────────┘
```

---

## Capas de la API (.NET 8 — Clean Architecture)

```
SolicitudesApp/
├── src/
│   ├── Domain/                        ← Entidades, Value Objects, Domain Events
│   │   ├── Entities/
│   │   │   ├── Tenant.cs
│   │   │   ├── Solicitud.cs
│   │   │   ├── Comentario.cs
│   │   │   └── Usuario.cs
│   │   ├── Enums/
│   │   │   └── EstadoSolicitud.cs
│   │   ├── Events/
│   │   │   └── SolicitudCreadaEvent.cs
│   │   └── Interfaces/
│   │       ├── ISolicitudRepository.cs
│   │       └── IServiceBusPublisher.cs
│   │
│   ├── Application/                   ← Casos de uso, CQRS, DTOs
│   │   ├── Solicitudes/
│   │   │   ├── Commands/
│   │   │   │   ├── CrearSolicitudCommand.cs
│   │   │   │   └── ActualizarEstadoCommand.cs
│   │   │   └── Queries/
│   │   │       ├── GetSolicitudesQuery.cs
│   │   │       └── GetSolicitudByIdQuery.cs
│   │   ├── Common/
│   │   │   ├── Behaviors/
│   │   │   │   ├── ValidationBehavior.cs    ← FluentValidation pipeline
│   │   │   │   └── LoggingBehavior.cs
│   │   │   └── Interfaces/
│   │   │       └── ICurrentUserService.cs
│   │   └── DTOs/
│   │       └── SolicitudDto.cs
│   │
│   ├── Infrastructure/                ← EF Core, Service Bus, Blob, Email
│   │   ├── Persistence/
│   │   │   ├── AppDbContext.cs        ← EF Core + RLS filter global
│   │   │   ├── Repositories/
│   │   │   └── Migrations/
│   │   ├── ServiceBus/
│   │   │   └── ServiceBusPublisher.cs
│   │   ├── Storage/
│   │   │   └── BlobStorageService.cs
│   │   └── Identity/
│   │       └── CurrentUserService.cs  ← extrae TenantId del JWT
│   │
│   ├── API/                           ← Controllers, SignalR Hub, Middlewares
│   │   ├── Controllers/
│   │   │   ├── SolicitudesController.cs
│   │   │   ├── TenantsController.cs
│   │   │   └── AuthController.cs
│   │   ├── Hubs/
│   │   │   └── SolicitudesHub.cs     ← SignalR tiempo real
│   │   ├── Middleware/
│   │   │   └── TenantMiddleware.cs
│   │   └── Program.cs
│   │
│   └── Functions/                     ← Azure Functions (workers)
│       ├── SolicitudProcessor.cs      ← Service Bus trigger
│       └── NotificationSender.cs      ← Service Bus trigger
│
└── tests/
    ├── Domain.Tests/
    ├── Application.Tests/
    └── Integration.Tests/
```

---

## Modelo de Datos (Azure SQL)

```sql
-- Multi-tenancy con Row-Level Security
Tenants         (Id, Nombre, Plan, CreadoEn, Activo)
Usuarios        (Id, TenantId, Email, Nombre, Rol, ExternalId)
Solicitudes     (Id, TenantId, Titulo, Descripcion, Estado, Prioridad,
                 UsuarioCreadorId, ConsultorAsignadoId, CreadoEn, ActualizadoEn)
Comentarios     (Id, SolicitudId, TenantId, UsuarioId, Texto, CreadoEn)
Archivos        (Id, SolicitudId, TenantId, NombreArchivo, BlobUrl, TamanoBytes, CreadoEn)
Categorias      (Id, TenantId, Nombre, Color)
Auditoria       (Id, TenantId, EntidadTipo, EntidadId, Accion, UsuarioId, FechaHora, Detalle)

-- Row-Level Security Policy
-- Filtra automáticamente por TenantId en cada query
-- El API inyecta SESSION_CONTEXT con el TenantId del JWT
```

---

## Flujo de una Solicitud (end-to-end)

```
1. Usuario en Angular llena formulario de solicitud
   ↓
2. Angular hace POST /api/solicitudes (con JWT de Azure AD B2C)
   ↓
3. API valida JWT → extrae TenantId → ejecuta CrearSolicitudCommand
   ↓
4. Handler persiste en Azure SQL con TenantId (RLS garantiza aislamiento)
   ↓
5. Handler publica mensaje en Service Bus Topic "solicitudes-events"
   ↓
6. API retorna 202 Accepted + SolicitudId (respuesta inmediata)
   ↓
   ┌────────────────────────────┐
   │  Service Bus (async)       │
   ├────────────────────────────┤
   │ Subscription: procesamiento│ → Function SolicitudProcessor
   │   - Asigna consultor       │   - Actualiza estado a "En Revisión"
   │   - Valida SLA             │   - Publica SolicitudProcesadaEvent
   │                            │
   │ Subscription: notificacion │ → Function NotificationSender
   │   - Email al creador       │   - SignalR push al portal
   │   - Email al consultor     │   - (sin necesidad de polling)
   └────────────────────────────┘
   ↓
7. Angular recibe push por SignalR → actualiza UI en tiempo real
   sin que el usuario tenga que refrescar la página
```

---

## Service Bus: Topología de Mensajes

```
Topic: solicitudes-events
│
├── Subscription: procesamiento
│   Filter: MessageType = 'SolicitudCreada' OR 'SolicitudActualizada'
│   Consumer: SolicitudProcessor (Azure Function)
│   Dead Letter: reintento 3 veces, luego DLQ → alerta Application Insights
│
└── Subscription: notificaciones
    Filter: MessageType IN ('SolicitudCreada', 'EstadoCambiado', 'ComentarioAgregado')
    Consumer: NotificationSender (Azure Function)
    Dead Letter: log + alerta, no bloquea el flujo principal
```

---

## Multi-tenancy (Row-Level Security)

```sql
-- En Azure SQL se crea una policy que filtra automáticamente
CREATE SECURITY POLICY TenantFilter
ADD FILTER PREDICATE dbo.fn_TenantAccessPredicate(TenantId)
ON dbo.Solicitudes, dbo.Comentarios, dbo.Archivos;

-- La API inyecta el TenantId en cada conexión:
EXEC sp_set_session_context 'TenantId', @tenantId;

-- EF Core lo hace automáticamente en AppDbContext.OnConfiguring()
-- → ningún developer puede olvidarse del filtro
```

---

## Autenticación (Azure AD B2C)

```
Usuario → Azure AD B2C (login/registro) → JWT con claims:
  - sub (userId externo)
  - extension_TenantId (custom claim)
  - roles (Admin | Consultor | Cliente)

API → valida JWT → TenantMiddleware extrae TenantId → inyecta en DbContext
Angular → MSAL.js gestiona tokens automáticamente
```

---

## Fases de Implementación

### Fase 1 — Core (2-3 semanas)
- [ ] Solución .NET 8 con Clean Architecture
- [ ] Azure SQL + EF Core + RLS
- [ ] API CRUD de Solicitudes
- [ ] Azure AD B2C (auth básica)
- [ ] Angular 19: login, lista y creación de solicitudes

### Fase 2 — Async + Real-time (1-2 semanas)
- [ ] Azure Service Bus (topic + subscriptions)
- [ ] Azure Function: SolicitudProcessor
- [ ] Azure Function: NotificationSender
- [ ] SignalR Hub en API
- [ ] Angular: integración SignalR (actualizaciones en tiempo real)

### Fase 3 — Producción (1 semana)
- [ ] Azure Blob Storage (adjuntos)
- [ ] Application Insights (logs + alertas)
- [ ] GitHub Actions CI/CD → Azure App Service
- [ ] Dead Letter Queue handling

---

## Costos Estimados Azure (créditos)

| Servicio | Tier | Costo aprox/mes |
|---|---|---|
| App Service | B1 (Basic) | ~$13 USD |
| Azure SQL | S0 (10 DTU) | ~$15 USD |
| Service Bus | Standard | ~$10 USD |
| Azure Functions | Consumption | ~$0 (free tier) |
| Blob Storage | LRS | ~$1 USD |
| Application Insights | Pay-per-use | ~$2 USD |
| Azure AD B2C | 50k MAU free | $0 |
| **Total** | | **~$41 USD/mes** |

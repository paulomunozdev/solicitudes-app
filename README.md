# SolicitudesApp

Sistema de gestión de solicitudes SaaS multi-tenant, construido con **.NET 8 Clean Architecture** + **Angular 19** desplegado en **Azure**.

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | Angular 19 (Standalone Components, Signals) |
| Backend | .NET 8 Clean Architecture (CQRS + MediatR) |
| Base de datos | Azure SQL Serverless + EF Core |
| Mensajería | Azure Service Bus (topic/subscription) |
| Email | Azure Functions v4 + Azure Communication Services |
| Tiempo real | SignalR Hub (grupos por tenant) |
| Hosting | Azure App Service (Linux) + Azure Static Web Apps |
| CI/CD | GitHub Actions |

## Arquitectura

```
┌─────────────────────────────────────────────────────┐
│  Angular 19 (Azure Static Web Apps)                 │
│  witty-meadow-05cecf60f.7.azurestaticapps.net       │
└─────────────────────┬───────────────────────────────┘
                      │ HTTP + WebSocket (SignalR)
┌─────────────────────▼───────────────────────────────┐
│  .NET 8 API (Azure App Service Linux)               │
│  Domain → Application → Infrastructure → API        │
│  + SignalR Hub (notificaciones en tiempo real)       │
└──────┬────────────────────────┬─────────────────────┘
       │                        │
┌──────▼──────┐    ┌────────────▼────────────────────┐
│ Azure SQL   │    │ Azure Service Bus               │
│ Serverless  │    │ Topic: solicitudes-events       │
└─────────────┘    └────────────┬────────────────────┘
                                │
                   ┌────────────▼────────────────────┐
                   │ Azure Functions v4 (.NET 8)     │
                   │ → Email via ACS                 │
                   └─────────────────────────────────┘
```

## Capas (Clean Architecture)

- **Domain** — Entidades, eventos de dominio, interfaces
- **Application** — Commands/Queries (CQRS), Behaviors (Logging, Validation)
- **Infrastructure** — EF Core, Service Bus, SignalR, Identity
- **API** — Controllers, Middleware, DevBypass (desarrollo)

## CI/CD

Los workflows de GitHub Actions están configurados en `.github/workflows/`:

- `deploy-api.yml` — Build + deploy a Azure App Service en cada push a `src/`
- `deploy-frontend.yml` — Build Angular + deploy a Azure Static Web Apps
- `deploy-functions.yml` — Build + deploy Azure Functions

> **Nota:** El deploy automatizado requiere habilitar Basic Auth en el SCM del tenant corporativo. En entornos sin esta restricción, los workflows funcionan con las credenciales configuradas en los secrets de GitHub.

## Desarrollo local

### Backend
```bash
cd src/API
dotnet run
# API disponible en https://localhost:62828
# Swagger en https://localhost:62828/swagger
```

### Frontend
```bash
cd frontend
npm install
ng serve
# App en http://localhost:4200
```

> El entorno de desarrollo usa `DevBypassHandler` para autenticación (sin necesidad de Azure AD B2C) y `NullServiceBusPublisher` si no hay Service Bus configurado.

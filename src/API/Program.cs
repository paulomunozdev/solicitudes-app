// build: 2026-04-13
using API;
using API.Middleware;
using Application.Common.Behaviors;
using Application.Common.Interfaces;
using Azure.Messaging.ServiceBus;
using Domain.Interfaces;
using FluentValidation;
using Infrastructure.Identity;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Repositories;
using Infrastructure.Realtime;
using Infrastructure.ServiceBus;
using MediatR;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Autenticación dual: Google + Azure AD ─────────────────────
var azureTenantId = builder.Configuration["AzureAd:TenantId"]!;
var azureClientId = builder.Configuration["AzureAd:ClientId"]!;

builder.Services.AddAuthentication()
    // Esquema Google: valida JWT de Google Identity Services
    .AddScheme<AuthenticationSchemeOptions, GoogleAuthHandler>("Google", _ => { })
    // Esquema Azure AD: valida JWT de Microsoft Entra ID
    .AddJwtBearer("AzureAd", options =>
    {
        options.Authority    = $"https://login.microsoftonline.com/{azureTenantId}/v2.0";
        options.Audience     = $"api://{azureClientId}";
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
        {
            ValidAudiences  = [$"api://{azureClientId}", azureClientId],
            ValidIssuer     = $"https://login.microsoftonline.com/{azureTenantId}/v2.0",
            NameClaimType   = "name",
        };
        options.Events = new Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerEvents
        {
            OnTokenValidated = async ctx =>
            {
                var enricher = new AzureAdClaimsTransformer(
                    ctx.HttpContext.RequestServices.GetRequiredService<IServiceScopeFactory>(),
                    ctx.HttpContext.RequestServices.GetRequiredService<ILogger<AzureAdClaimsTransformer>>(),
                    ctx.HttpContext.RequestServices.GetRequiredService<IConfiguration>());
                await enricher.EnrichAsync(ctx.Principal!);
            }
        };
    });

// Política combinada: acepta cualquiera de los dos esquemas
builder.Services.AddAuthorization(options =>
{
    var combinedPolicy = new AuthorizationPolicyBuilder("Google", "AzureAd")
        .RequireAuthenticatedUser()
        .Build();
    options.DefaultPolicy  = combinedPolicy;
    options.FallbackPolicy = combinedPolicy;
});

// ── Base de datos ──────────────────────────────────────────────
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"),
        sql => sql.EnableRetryOnFailure(maxRetryCount: 5, maxRetryDelay: TimeSpan.FromSeconds(10), errorNumbersToAdd: null)));

// ── Service Bus ────────────────────────────────────────────────
var serviceBusConnectionString = builder.Configuration["AzureServiceBus:ConnectionString"];
if (!string.IsNullOrWhiteSpace(serviceBusConnectionString))
    builder.Services.AddSingleton(_ => new ServiceBusClient(serviceBusConnectionString));

// ── MediatR + Behaviors ────────────────────────────────────────
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(Application.Solicitudes.Commands.CrearSolicitudCommand).Assembly));

builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
builder.Services.AddTransient(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));

// ── FluentValidation ───────────────────────────────────────────
builder.Services.AddValidatorsFromAssembly(typeof(Application.Solicitudes.Commands.CrearSolicitudCommand).Assembly);

// ── Repositorios y servicios ───────────────────────────────────
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddScoped<Application.Common.Interfaces.IAppDbContext>(sp =>
    sp.GetRequiredService<Infrastructure.Persistence.AppDbContext>());
builder.Services.AddScoped<SolicitudRepository>();
builder.Services.AddScoped<ComentarioRepository>();
builder.Services.AddScoped<IUnitOfWork, UnitOfWork>();
if (!string.IsNullOrWhiteSpace(serviceBusConnectionString))
    builder.Services.AddScoped<IServiceBusPublisher, ServiceBusPublisher>();
else
    builder.Services.AddScoped<IServiceBusPublisher, NullServiceBusPublisher>();

// ── SignalR ────────────────────────────────────────────────────
builder.Services.AddSignalR();
builder.Services.AddScoped<IRealtimeNotifier, SignalRNotifier>();

// ── CORS (Angular dev) ─────────────────────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("Angular", policy =>
        policy.WithOrigins("http://localhost:4200", "https://witty-meadow-05cecf60f.7.azurestaticapps.net")
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials()));

// ── Swagger ────────────────────────────────────────────────────
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "SolicitudesApp API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization", Type = SecuritySchemeType.Http,
        Scheme = "Bearer", BearerFormat = "JWT", In = ParameterLocation.Header
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        }
    });
});

var app = builder.Build();

// ── Middleware pipeline ────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<Infrastructure.Realtime.SolicitudesHub>("/hubs/solicitudes");

// ── Diagnóstico temporal ───────────────────────────────────────
app.MapGet("/api/diag/version", () => Results.Ok(new { build = "2026-04-13-v5", auth = "Google+AzureAd", controllers = new[] { "Solicitudes", "Usuarios", "Categorias", "UnidadesNegocio" } })).AllowAnonymous();

app.Run();

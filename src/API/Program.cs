// build: 2026-04-13
using API;
using API.Middleware;
using Application.Common.Behaviors;
using Application.Common.Interfaces;
using AspNetCoreRateLimit;
using Azure.Messaging.ServiceBus;
using Domain.Enums;
using Domain.Interfaces;
using FluentValidation;
using Infrastructure.Identity;
using Infrastructure.Persistence;
using Infrastructure.Persistence.Repositories;
using Infrastructure.Realtime;
using Infrastructure.ServiceBus;
using Infrastructure.Storage;
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
    .AddScheme<AuthenticationSchemeOptions, GoogleAuthHandler>("Google", _ => { })
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

// ── Autorización: política base + política AdminOGestor ────────
builder.Services.AddAuthorization(options =>
{
    // Política base: acepta cualquiera de los dos esquemas
    var combinedPolicy = new AuthorizationPolicyBuilder("Google", "AzureAd")
        .RequireAuthenticatedUser()
        .Build();
    options.DefaultPolicy  = combinedPolicy;
    options.FallbackPolicy = combinedPolicy;

    // Política de acceso restringido a Admin y Gestor
    options.AddPolicy("AdminOGestor", policy =>
        policy.RequireAuthenticatedUser()
              .AddAuthenticationSchemes("Google", "AzureAd")
              .RequireAssertion(ctx =>
              {
                  var rolClaim = ctx.User.FindFirst("rol")?.Value;
                  if (!int.TryParse(rolClaim, out var rolVal)) return false;
                  return rolVal >= (int)RolUsuario.Gestor; // Gestor=2, Admin=3
              }));
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

// ── Blob Storage ──────────────────────────────────────────────
builder.Services.AddScoped<IBlobStorageService, BlobStorageService>();

// ── Auditoría ─────────────────────────────────────────────────
builder.Services.AddScoped<IAuditoriaService, AuditoriaService>();

// ── SignalR ────────────────────────────────────────────────────
builder.Services.AddSignalR();
builder.Services.AddScoped<IRealtimeNotifier, SignalRNotifier>();

// ── Rate Limiting (protección contra brute force / enumeración) ─
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(options =>
{
    options.EnableEndpointRateLimiting = true;
    options.StackBlockedRequests       = false;
    options.RealIpHeader               = "X-Real-IP";
    options.ClientIdHeader             = "X-ClientId";
    options.GeneralRules = new List<RateLimitRule>
    {
        new() { Endpoint = "*", Period = "1m",  Limit = 120 },  // 120 req/min global
        new() { Endpoint = "post:/api/usuarios/me", Period = "1m", Limit = 10 }, // login
    };
});
builder.Services.AddInMemoryRateLimiting();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

// ── CORS (Angular dev + producción) ───────────────────────────
builder.Services.AddCors(options =>
    options.AddPolicy("Angular", policy =>
        policy.WithOrigins("http://localhost:4200", "https://witty-meadow-05cecf60f.7.azurestaticapps.net")
              .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
              .WithHeaders("Authorization", "Content-Type", "X-ClientId", "X-Requested-With")
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

// ── Security headers ──────────────────────────────────────────
app.Use(async (context, next) =>
{
    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
    context.Response.Headers["X-Frame-Options"]           = "DENY";
    context.Response.Headers["X-Content-Type-Options"]    = "nosniff";
    context.Response.Headers["Referrer-Policy"]           = "strict-origin-when-cross-origin";
    context.Response.Headers["Permissions-Policy"]        = "geolocation=(), microphone=(), camera=()";
    await next();
});

// ── Middleware pipeline ────────────────────────────────────────
app.UseMiddleware<ExceptionMiddleware>();

// Swagger solo en Development
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseIpRateLimiting();
app.UseHttpsRedirection();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<Infrastructure.Realtime.SolicitudesHub>("/hubs/solicitudes");

app.Run();

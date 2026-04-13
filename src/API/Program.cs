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
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

// ── Autenticación Google Identity Services ─────────────────────
builder.Services.AddAuthentication("Google")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, GoogleAuthHandler>(
        "Google", _ => { });
builder.Services.AddAuthorization();

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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("Angular");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<Infrastructure.Realtime.SolicitudesHub>("/hubs/solicitudes");

app.Run();

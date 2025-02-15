
using System.Data;
using ApiDevopsIA.Model;
using Dapper;
using Microsoft.Data.SqlClient;
namespace ApiDevopsIA
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Agregar la conexión a la base de datos usando Dapper
            builder.Services.AddScoped<IDbConnection>(sp =>
                new SqlConnection(builder.Configuration.GetConnectionString("AzureSqlDb"))
            );

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            var app = builder.Build();

            // Agregar un endpoint para obtener versiones desde la base de datos
            app.MapGet("/api/versions", async (IDbConnection db) =>
            {
                var query = "SELECT Id, VersionNumber, ReleaseDate, Description FROM Versions";
                var versions = await db.QueryAsync<VersionModel>(query);
                return Results.Ok(versions);
            });

            // Agregar un endpoint para insertar nuevas versiones
            app.MapPost("/api/versions", async (VersionModel version, IDbConnection db) =>
            {
                var query = "INSERT INTO Versions (VersionNumber, ReleaseDate, Description) VALUES (@VersionNumber, @ReleaseDate, @Description)";
                await db.ExecuteAsync(query, version);
                return Results.Created($"/api/versions/{version.Id}", version);
            });

            // Configure the HTTP request pipeline.
            app.UseSwagger();
            app.UseSwaggerUI();

            app.UseHttpsRedirection();

            app.UseAuthorization();


            app.MapControllers();

            app.Run();
        }
    }
}

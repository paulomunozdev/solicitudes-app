using Azure.Communication.Email;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

var host = new HostBuilder()
    .ConfigureFunctionsWorkerDefaults()
    .ConfigureServices((ctx, services) =>
    {
        services.AddAzureClients(builder =>
        {
            builder.AddEmailClient(ctx.Configuration["AcsConnectionString"]);
        });
    })
    .Build();

host.Run();

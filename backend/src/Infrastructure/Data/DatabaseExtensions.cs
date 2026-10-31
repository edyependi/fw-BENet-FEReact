namespace Infrastructure.Data;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

public static class DatabaseExtensions
{
    public static IServiceCollection AddAppDatabase(this IServiceCollection services, IConfiguration config)
    {
        var provider = config.GetValue<string>("DatabaseProvider") ?? "Sqlite";
        var connectionString = config.GetConnectionString("DefaultConnection") 
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' not found.");

        services.AddDbContext<AppDbContext>(options =>
        {
            switch (provider.ToLowerInvariant())
            {
                case "sqlite":
                    options.UseSqlite(connectionString);
                    break;

                case "postgresql":
                case "postgres":
                    // Untuk migrasi ke PostgreSQL:
                    // 1. Install package NuGet: Npgsql.EntityFrameworkCore.PostgreSQL
                    // 2. Uncomment baris berikut:
                    // options.UseNpgsql(connectionString);
                    throw new NotImplementedException("Aktifkan options.UseNpgsql() setelah menginstal package Npgsql.");

                default:
                    throw new NotSupportedException($"Database provider '{provider}' tidak didukung.");
            }
        });

        return services;
    }
}


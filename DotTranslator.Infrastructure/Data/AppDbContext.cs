using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using DotTranslator.Infrastructure.Data.Entities;
using DotTranslator.Shared.Models;

namespace DotTranslator.Infrastructure.Data;

public class AppDbContext : DbContext
{
    public DbSet<HistoryRow> History => Set<HistoryRow>();
    public DbSet<TmRow> TmEntries => Set<TmRow>();
    public DbSet<SettingsRow> Settings => Set<SettingsRow>();
    public DbSet<LocalStatsRow> LocalStats => Set<LocalStatsRow>();
    public DbSet<ProviderMetricRow> ProviderMetrics => Set<ProviderMetricRow>();

    private readonly string _dbPath;

    public AppDbContext(string dbPath)
    {
        _dbPath = dbPath;
    }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
    {
        options.UseSqlite($"Data Source={_dbPath};");
    }

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<HistoryRow>(e =>
        {
            e.ToTable("history");
            e.HasKey(x => x.Id);
            e.HasIndex(x => x.CreatedAt);
        });

        b.Entity<TmRow>(e =>
        {
            e.ToTable("tm_entries");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.SourceLang, x.TargetLang, x.SourceText }).IsUnique();
        });

        b.Entity<SettingsRow>(e =>
        {
            e.ToTable("settings");
            e.HasKey(x => x.Key);
        });

        b.Entity<LocalStatsRow>(e =>
        {
            e.ToTable("local_stats");
            e.HasKey(x => x.Id);
            e.HasIndex(x => new { x.Feature, x.CreatedAt });
        });

        b.Entity<ProviderMetricRow>(e =>
        {
            e.ToTable("provider_metrics");
            e.HasKey(x => new { x.Provider, x.Date });
        });
    }

    public void InitializeDatabase()
    {
        Database.EnsureCreated();

        // Enable WAL mode
        var conn = Database.GetDbConnection() as SqliteConnection;
        if (conn != null)
        {
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;";
            cmd.ExecuteNonQuery();
        }
    }
}

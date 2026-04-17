using DotTranslator.Core.Settings;
using DotTranslator.Infrastructure.Data.Entities;

namespace DotTranslator.Infrastructure.Data;

/// <summary>
/// SQLite 设置键值存储实现。
/// </summary>
public class SqliteSettingsRepository : ISettingsRepository
{
    private readonly AppDbContext _db;

    public SqliteSettingsRepository(AppDbContext db)
    {
        _db = db;
    }

    public string? GetSetting(string key) => _db.Settings.Find(key)?.Value;

    public void SetSetting(string key, string value)
    {
        var existing = _db.Settings.Find(key);
        if (existing != null)
            existing.Value = value;
        else
            _db.Settings.Add(new SettingsRow { Key = key, Value = value });
        _db.SaveChanges();
    }
}

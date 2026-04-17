using DotTranslator.Core.History;
using DotTranslator.Infrastructure.Data.Entities;
using DotTranslator.Shared.Models;

namespace DotTranslator.Infrastructure.Data;

public class SqliteRepository : IHistoryRepository, ITranslationMemory
{
    private readonly AppDbContext _db;

    public SqliteRepository(AppDbContext db)
    {
        _db = db;
    }

    public HistoryEntry Add(HistoryEntry entry)
    {
        _db.History.Add(new HistoryRow
        {
            Id = entry.Id,
            SourceText = entry.SourceText,
            TargetText = entry.TargetText,
            SourceLang = entry.SourceLang,
            TargetLang = entry.TargetLang,
            Provider = entry.Provider,
            IsFavorite = entry.IsFavorite,
            CreatedAt = new DateTimeOffset(entry.CreatedAt).ToUnixTimeMilliseconds()
        });
        _db.SaveChanges();
        return entry;
    }

    public IReadOnlyList<HistoryEntry> GetAll(int limit = 100)
    {
        return _db.History.OrderByDescending(h => h.CreatedAt).Take(limit)
            .Select(MapToEntry).ToList();
    }

    public IReadOnlyList<HistoryEntry> Search(string query)
    {
        return _db.History
            .Where(h => h.SourceText.Contains(query) || h.TargetText.Contains(query))
            .OrderByDescending(h => h.CreatedAt).Take(50)
            .Select(MapToEntry).ToList();
    }

    public void SetFavorite(string id, bool favorite)
    {
        var row = _db.History.Find(id);
        if (row != null) { row.IsFavorite = favorite; _db.SaveChanges(); }
    }

    public void Delete(string id)
    {
        var row = _db.History.Find(id);
        if (row != null) { _db.History.Remove(row); _db.SaveChanges(); }
    }

    public void DeleteBatch(IEnumerable<string> ids)
    {
        var rows = _db.History.Where(h => ids.Contains(h.Id)).ToList();
        _db.History.RemoveRange(rows);
        _db.SaveChanges();
    }

    public void ClearAll()
    {
        _db.History.ExecuteDelete();
    }

    public string Export()
    {
        var entries = _db.History.OrderByDescending(h => h.CreatedAt).Select(MapToEntry).ToList();
        return System.Text.Json.JsonSerializer.Serialize(entries, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
    }

    public TMEntry? Lookup(string sourceLang, string targetLang, string sourceText)
    {
        var row = _db.TmEntries.FirstOrDefault(t =>
            t.SourceLang == sourceLang && t.TargetLang == targetLang && t.SourceText == sourceText);
        return row != null ? MapToTmEntry(row) : null;
    }

    public void Insert(TMEntry entry)
    {
        var existing = _db.TmEntries.FirstOrDefault(t =>
            t.SourceLang == entry.SourceLang && t.TargetLang == entry.TargetLang && t.SourceText == entry.SourceText);

        if (existing != null)
        {
            existing.TargetText = entry.TargetText;
            existing.UsageCount = entry.UsageCount;
        }
        else
        {
            _db.TmEntries.Add(new TmRow
            {
                Id = entry.Id,
                SourceLang = entry.SourceLang,
                TargetLang = entry.TargetLang,
                SourceText = entry.SourceText,
                TargetText = entry.TargetText,
                UsageCount = entry.UsageCount,
                CreatedAt = new DateTimeOffset(entry.CreatedAt).ToUnixTimeMilliseconds()
            });
        }
        _db.SaveChanges();
    }

    private static HistoryEntry MapToEntry(HistoryRow r) => new(
        r.Id, r.SourceText, r.TargetText, r.SourceLang, r.TargetLang, r.Provider, r.IsFavorite,
        DateTimeOffset.FromUnixTimeMilliseconds(r.CreatedAt).DateTime);

    private static TMEntry MapToTmEntry(TmRow r) => new(
        r.Id, r.SourceLang, r.TargetLang, r.SourceText, r.TargetText, r.UsageCount,
        DateTimeOffset.FromUnixTimeMilliseconds(r.CreatedAt).DateTime);
}

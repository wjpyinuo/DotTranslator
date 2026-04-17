using DotTranslator.Shared.Models;

namespace DotTranslator.Core.History;

public interface IHistoryRepository
{
    HistoryEntry Add(HistoryEntry entry);
    IReadOnlyList<HistoryEntry> GetAll(int limit = 100);
    IReadOnlyList<HistoryEntry> Search(string query);
    void SetFavorite(string id, bool favorite);
    void Delete(string id);
    void DeleteBatch(IEnumerable<string> ids);
    void ClearAll();
    string Export();
}

public interface ITranslationMemory
{
    TMEntry? Lookup(string sourceLang, string targetLang, string sourceText);
    void Insert(TMEntry entry);
}

public class HistoryService
{
    private readonly IHistoryRepository _repository;
    private readonly ITranslationMemory _tm;

    public HistoryService(IHistoryRepository repository, ITranslationMemory tm)
    {
        _repository = repository;
        _tm = tm;
    }

    public HistoryEntry AddEntry(string sourceText, string targetText, string sourceLang, string targetLang, string provider)
    {
        var existing = _tm.Lookup(sourceLang, targetLang, sourceText);
        if (existing != null)
        {
            _tm.Insert(existing with { UsageCount = existing.UsageCount + 1 });
        }
        else
        {
            _tm.Insert(new TMEntry(Guid.NewGuid().ToString(), sourceLang, targetLang, sourceText, targetText, 1, DateTime.UtcNow));
        }

        return _repository.Add(new HistoryEntry(
            Guid.NewGuid().ToString(), sourceText, targetText, sourceLang, targetLang, provider, false, DateTime.UtcNow));
    }

    public TMEntry? LookupTM(string sourceLang, string targetLang, string sourceText) =>
        _tm.Lookup(sourceLang, targetLang, sourceText);

    public IReadOnlyList<HistoryEntry> GetHistory(int limit = 100) => _repository.GetAll(limit);
    public IReadOnlyList<HistoryEntry> Search(string query) => _repository.Search(query);
    public void SetFavorite(string id, bool fav) => _repository.SetFavorite(id, fav);
    public void Delete(string id) => _repository.Delete(id);
    public void DeleteBatch(IEnumerable<string> ids) => _repository.DeleteBatch(ids);
    public void ClearAll() => _repository.ClearAll();
    public string Export() => _repository.Export();
}

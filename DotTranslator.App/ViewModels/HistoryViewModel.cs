using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using DotTranslator.Core.History;
using DotTranslator.Shared.Models;
using System;
using System.Collections.ObjectModel;
using System.Linq;

namespace DotTranslator.App.ViewModels;

public partial class HistoryViewModel : ObservableObject
{
    private readonly HistoryService _historyService;

    [ObservableProperty] private string _searchQuery = string.Empty;
    [ObservableProperty] private string _statusMessage = string.Empty;

    public ObservableCollection<HistoryEntry> Entries { get; } = new();

    public HistoryViewModel(HistoryService historyService)
    {
        _historyService = historyService;
        LoadHistory();
    }

    public void Refresh() => LoadHistory();

    private void LoadHistory()
    {
        Entries.Clear();
        foreach (var entry in _historyService.GetHistory(200))
        {
            Entries.Add(entry);
        }
    }

    [RelayCommand]
    private void Search()
    {
        if (string.IsNullOrWhiteSpace(SearchQuery))
        {
            LoadHistory();
            return;
        }
        Entries.Clear();
        foreach (var entry in _historyService.Search(SearchQuery))
        {
            Entries.Add(entry);
        }
    }

    [RelayCommand]
    private void ToggleFavorite(string? id)
    {
        if (string.IsNullOrEmpty(id)) return;
        var entry = Entries.FirstOrDefault(e => e.Id == id);
        if (entry != null)
        {
            _historyService.SetFavorite(id, !entry.IsFavorite);
            LoadHistory();
        }
    }

    [RelayCommand]
    private void DeleteEntry(string? id)
    {
        if (string.IsNullOrEmpty(id)) return;
        _historyService.Delete(id);
        LoadHistory();
    }

    [RelayCommand]
    private void ClearAll()
    {
        _historyService.ClearAll();
        LoadHistory();
        StatusMessage = "历史记录已清除";
    }

    [RelayCommand]
    private void Export()
    {
        var json = _historyService.Export();
        StatusMessage = $"已导出 {Entries.Count} 条记录";
    }
}

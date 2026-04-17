using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace DotTranslator.App.Views;

public partial class HistoryView : UserControl
{
    public HistoryView()
    {
        InitializeComponent();
    }

    private void OnSearchKeyDown(object? sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter && DataContext is ViewModels.HistoryViewModel vm)
        {
            vm.SearchCommand.Execute(null);
        }
    }

    private void OnToggleFavorite(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string id } && DataContext is ViewModels.HistoryViewModel vm)
        {
            vm.ToggleFavoriteCommand.Execute(id);
        }
    }

    private void OnDeleteEntry(object? sender, RoutedEventArgs e)
    {
        if (sender is Button { Tag: string id } && DataContext is ViewModels.HistoryViewModel vm)
        {
            vm.DeleteEntryCommand.Execute(id);
        }
    }
}

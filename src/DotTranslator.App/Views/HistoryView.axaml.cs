using Avalonia.Controls;
using Avalonia.Input;

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
}

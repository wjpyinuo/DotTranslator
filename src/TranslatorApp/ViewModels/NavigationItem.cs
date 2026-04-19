using CommunityToolkit.Mvvm.ComponentModel;

namespace TranslatorApp.ViewModels;

/// <summary>导航项（用于侧边栏页签）</summary>
public partial class NavigationItem : ObservableObject
{
    public string Key { get; }
    public string Icon { get; }
    public string Label { get; }

    [ObservableProperty]
    private bool _isSelected;

    public NavigationItem(string key, string icon, string label)
    {
        Key = key;
        Icon = icon;
        Label = label;
    }
}

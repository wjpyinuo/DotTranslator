using CommunityToolkit.Mvvm.ComponentModel;

namespace DotTranslator.App.ViewModels;

public partial class TranslationViewModel : ObservableObject
{
    [ObservableProperty] private string _text = string.Empty;
}

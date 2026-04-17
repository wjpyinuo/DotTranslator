using Avalonia.Data.Converters;

namespace DotTranslator.App.ViewModels;

public static class Converters
{
    public static readonly IValueConverter ThemeLightConverter = new FuncValueConverter<string?, bool>(
        value => value == "light",
        (bool isChecked) => isChecked ? "light" : "");

    public static readonly IValueConverter ThemeDarkConverter = new FuncValueConverter<string?, bool>(
        value => value == "dark",
        (bool isChecked) => isChecked ? "dark" : "");

    public static readonly IValueConverter ThemeSystemConverter = new FuncValueConverter<string?, bool>(
        value => value == "default",
        (bool isChecked) => isChecked ? "default" : "");

    public static readonly IValueConverter NullToBoolConverter = new FuncValueConverter<object?, bool>(
        value => value != null);

    public static readonly IValueConverter StringNotEmptyConverter = new FuncValueConverter<string?, bool>(
        value => !string.IsNullOrEmpty(value));
}

using Avalonia.Data.Converters;
using System;
using System.Globalization;

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
}

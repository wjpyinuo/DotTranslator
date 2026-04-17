using Avalonia.Data.Converters;
using System;
using System.Globalization;

namespace DotTranslator.App.Controls;

public static class Converters
{
    public static readonly IValueConverter EqualConverter = new FuncValueConverter<string, string?>(
        (value, param) => value == param ? "true" : null);

    public static readonly IValueConverter TabClassConverter = new FuncValueConverter<string, string?>(
        (selectedTab, param) =>
        {
            if (selectedTab == param?.ToString()) return "tab active";
            return "tab";
        });

    public static readonly IValueConverter InverseBoolConverter = new FuncValueConverter<bool, bool>(
        value => !value);

    public static readonly IValueConverter BoolToOpacityConverter = new FuncValueConverter<bool, double>(
        value => value ? 1.0 : 0.5);
}

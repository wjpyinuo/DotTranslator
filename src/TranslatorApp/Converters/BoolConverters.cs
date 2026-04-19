using System.Globalization;
using Avalonia.Data.Converters;

namespace TranslatorApp.Converters;

/// <summary>bool → 主题图标 (false=🌙, true=☀️)</summary>
public class ThemeIconConverter : BoolToValueConverter<string>
{
    public ThemeIconConverter() { FalseValue = "🌙"; TrueValue = "☀️"; }
}

/// <summary>bool → 置顶图标 (false=📌, true=📍)</summary>
public class PinIconConverter : BoolToValueConverter<string>
{
    public PinIconConverter() { FalseValue = "📌"; TrueValue = "📍"; }
}

/// <summary>bool → 收藏图标 (false="☆ 收藏", true="⭐ 已收藏")</summary>
public class FavoriteIconConverter : BoolToValueConverter<string>
{
    public FavoriteIconConverter() { FalseValue = "☆ 收藏"; TrueValue = "⭐ 已收藏"; }
}

/// <summary>bool → 主题文字 (false="浅色", true="深色")</summary>
public class BoolToThemeConverter : BoolToValueConverter<string>
{
    public BoolToThemeConverter() { FalseValue = "浅色"; TrueValue = "深色"; }
}

/// <summary>bool → 导航选中样式 (true=accent, false=default)</summary>
public class BoolToNavStyleConverter : BoolToValueConverter<string>
{
    public BoolToNavStyleConverter() { FalseValue = "nav-item"; TrueValue = "nav-item selected"; }
}

/// <summary>泛型 BoolToValue 转换器基类</summary>
public class BoolToValueConverter<T> : IValueConverter
{
    public T? TrueValue { get; set; }
    public T? FalseValue { get; set; }

    public object? Convert(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        return value is true ? TrueValue : FalseValue;
    }

    public object ConvertBack(object? value, Type targetType, object? parameter, CultureInfo culture)
    {
        throw new NotSupportedException();
    }
}

using Avalonia;
using Avalonia.Controls;
using Avalonia.Media;

namespace TranslatorApp.Assets.Themes;

public partial class Colors : ResourceDictionary
{
    private static bool _isDark;

    /// <summary>在 Application.Resources 中切换浅色/深色主题</summary>
    public static void ApplyTheme(bool dark)
    {
        _isDark = dark;
        var app = Application.Current;
        if (app?.Resources == null) return;

        // 替换 Brush 颜色
        foreach (var (brushKey, lightColor, darkColor) in BrushTokens)
        {
            if (app.Resources.TryGetResource(brushKey, null, out var res) && res is SolidColorBrush brush)
            {
                brush.Color = dark ? darkColor : lightColor;
            }
        }

        // 替换 BoxShadow
        foreach (var (shadowKey, lightKey, darkKey) in ShadowTokens)
        {
            var srcKey = dark ? darkKey : lightKey;
            if (app.Resources.TryGetResource(srcKey, null, out var shadow) && shadow is BoxShadows bs)
            {
                app.Resources[shadowKey] = bs;
            }
        }
    }

    public static bool IsDark => _isDark;

    private static readonly (string BrushKey, Color Light, Color Dark)[] BrushTokens =
    [
        ("BgBrush",            FromHex("#E0E5EC"), FromHex("#2B2D42")),
        ("ShadowLightBrush",   FromHex("#FFFFFF"), FromHex("#383A54")),
        ("ShadowDarkBrush",    FromHex("#B8C0CC"), FromHex("#1E2030")),
        ("TextPrimaryBrush",   FromHex("#2D3436"), FromHex("#DFE6E9")),
        ("TextSecondaryBrush", FromHex("#636E72"), FromHex("#B2BEC3")),
        ("TextDisabledBrush",  FromHex("#A0A8B0"), FromHex("#6C7380")),
        ("AccentBrush",        FromHex("#6C5CE7"), FromHex("#A29BFE")),
        ("AccentHoverBrush",   FromHex("#5A4BD6"), FromHex("#8B84FC")),
        ("AccentPressedBrush", FromHex("#4839B0"), FromHex("#7470E0")),
        ("SuccessBrush",       FromHex("#00B894"), FromHex("#55EFC4")),
        ("WarningBrush",       FromHex("#FDCB6E"), FromHex("#FFEAA7")),
        ("ErrorBrush",         FromHex("#E17055"), FromHex("#FF7675")),
        ("CardBgBrush",        FromHex("#E0E5EC"), FromHex("#2B2D42")),
        ("InputBgBrush",       FromHex("#E0E5EC"), FromHex("#2B2D42")),
        ("DividerBrush",       FromHex("#C8CDD5"), FromHex("#3D3F58")),
    ];

    private static readonly (string TargetKey, string LightKey, string DarkKey)[] ShadowTokens =
    [
        ("Neu.Outset",        "Neu.Outset",        "Dark.Neu.Outset"),
        ("Neu.OutsetHover",   "Neu.OutsetHover",   "Dark.Neu.OutsetHover"),
        ("Neu.OutsetSmall",   "Neu.OutsetSmall",   "Dark.Neu.OutsetSmall"),
        ("Neu.OutsetPrimary", "Neu.OutsetPrimary", "Dark.Neu.OutsetPrimary"),
        ("Neu.Inset",         "Neu.Inset",         "Dark.Neu.Inset"),
        ("Neu.InsetDeep",     "Neu.InsetDeep",     "Dark.Neu.InsetDeep"),
        ("Neu.Flat",          "Neu.Flat",          "Dark.Neu.Flat"),
    ];

    private static Color FromHex(string hex) => Color.Parse(hex);
}

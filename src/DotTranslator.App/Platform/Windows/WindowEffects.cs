using Avalonia.Controls;
using System;
using System.Runtime.InteropServices;

namespace DotTranslator.App.Platform.Windows;

public enum BackdropType { None = 0, Mica = 2, Acrylic = 3, Tabbed = 4 }

public static class WindowEffects
{
    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int attrValue, int attrSize);

    private const int DWMWA_WINDOW_CORNER_PREFERENCE = 33;
    private const int DWMWA_SYSTEMBACKDROP_TYPE = 38;

    public static void EnableRoundedCorners(Window window)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var hwnd = TryGetHandle(window);
        if (hwnd == IntPtr.Zero) return;

        int preference = 2; // DWMWCP_ROUND
        DwmSetWindowAttribute(hwnd, DWMWA_WINDOW_CORNER_PREFERENCE, ref preference, sizeof(int));
    }

    public static void SetBackdropType(Window window, BackdropType type)
    {
        if (!OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var hwnd = TryGetHandle(window);
        if (hwnd == IntPtr.Zero) return;

        int backdropType = (int)type;
        DwmSetWindowAttribute(hwnd, DWMWA_SYSTEMBACKDROP_TYPE, ref backdropType, sizeof(int));
    }

    private static IntPtr TryGetHandle(Window window)
    {
        try
        {
            return window.TryGetPlatformHandle()?.Handle ?? IntPtr.Zero;
        }
        catch { return IntPtr.Zero; }
    }
}

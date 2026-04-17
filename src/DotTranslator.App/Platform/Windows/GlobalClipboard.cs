using DotTranslator.Core.Security;
using System;
using System.Runtime.InteropServices;
using System.Threading;

namespace DotTranslator.App.Platform.Windows;

public class GlobalClipboard : IDisposable
{
    [DllImport("user32.dll")]
    private static extern IntPtr SetClipboardViewer(IntPtr hWndNewViewer);

    [DllImport("user32.dll")]
    private static extern bool ChangeClipboardChain(IntPtr hWndRemove, IntPtr hWndNewNext);

    private Timer? _pollTimer;
    private string _lastText = string.Empty;
    private bool _enabled = true;

    public event Action<string>? TextChanged;

    public bool Enabled
    {
        get => _enabled;
        set => _enabled = value;
    }

    public void Start()
    {
        _pollTimer = new Timer(_ => Poll(), null, 500, 500);
    }

    private void Poll()
    {
        if (!_enabled) return;
        try
        {
            var text = GetClipboardText();
            if (!string.IsNullOrEmpty(text) && text != _lastText)
            {
                _lastText = text;
                if (!SensitiveContentFilter.IsSensitive(text))
                {
                    TextChanged?.Invoke(text);
                }
            }
        }
        catch { /* clipboard locked */ }
    }

    [DllImport("user32.dll")]
    private static extern bool OpenClipboard(IntPtr hWndNewOwner);
    [DllImport("user32.dll")]
    private static extern bool CloseClipboard();
    [DllImport("user32.dll")]
    private static extern IntPtr GetClipboardData(uint uFormat);
    [DllImport("user32.dll")]
    private static extern bool IsClipboardFormatAvailable(uint format);
    [DllImport("kernel32.dll")]
    private static extern IntPtr GlobalLock(IntPtr hMem);
    [DllImport("kernel32.dll")]
    private static extern bool GlobalUnlock(IntPtr hMem);

    private const uint CF_UNICODETEXT = 13;

    private static string? GetClipboardText()
    {
        if (!IsClipboardFormatAvailable(CF_UNICODETEXT)) return null;
        if (!OpenClipboard(IntPtr.Zero)) return null;
        try
        {
            var handle = GetClipboardData(CF_UNICODETEXT);
            if (handle == IntPtr.Zero) return null;
            var pointer = GlobalLock(handle);
            if (pointer == IntPtr.Zero) return null;
            try { return Marshal.PtrToStringUni(pointer); }
            finally { GlobalUnlock(handle); }
        }
        finally { CloseClipboard(); }
    }

    public void Dispose()
    {
        _pollTimer?.Dispose();
    }
}

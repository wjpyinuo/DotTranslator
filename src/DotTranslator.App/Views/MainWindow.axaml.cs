using Avalonia.Controls;
using Avalonia.Input;
using DotTranslator.App.Platform.Windows;
using System;

namespace DotTranslator.App.Views;

public partial class MainWindow : Window
{
    private HotKeyManager? _hotKeyManager;

    public MainWindow()
    {
        InitializeComponent();
        Opened += OnOpened;
    }

    private void OnOpened(object? sender, EventArgs e)
    {
        if (OperatingSystem.IsWindows())
        {
            WindowEffects.EnableRoundedCorners(this);
            WindowEffects.SetBackdropType(this, BackdropType.Acrylic);

            // Alt+Space to toggle window visibility
            _hotKeyManager = new HotKeyManager();
            _hotKeyManager.Register(0x0001 /* MOD_ALT */, 0x20 /* VK_SPACE */, () =>
            {
                if (IsVisible) Hide();
                else { Show(); Activate(); }
            });
        }
    }

    protected override void OnClosed(EventArgs e)
    {
        _hotKeyManager?.Dispose();
        base.OnClosed(e);
    }
}

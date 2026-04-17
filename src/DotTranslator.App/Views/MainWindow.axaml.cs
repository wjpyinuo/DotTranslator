using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using DotTranslator.App.Platform.Windows;
using System;

namespace DotTranslator.App.Views;

public partial class MainWindow : Window
{
    private HotKeyManager? _hotKeyManager;

    public MainWindow()
    {
        InitializeComponent();

        // Drag to move (for frameless window)
        if (this.FindControl<Border>("TitleBarDragArea") is { } dragArea)
        {
            dragArea.PointerPressed += (_, e) =>
            {
                if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
                    BeginMoveDrag(e);
            };
        }

        Opened += OnOpened;
    }

    private void OnOpened(object? sender, EventArgs e)
    {
        // Setup Windows-specific features
        if (OperatingSystem.IsWindows())
        {
            WindowEffects.EnableRoundedCorners(this);
            WindowEffects.SetBackdropType(this, BackdropType.Acrylic);

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

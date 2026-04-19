using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;

namespace TranslatorApp.Views;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
    }

    private void MinimizeClick(object? sender, RoutedEventArgs e)
    {
        WindowState = WindowState.Minimized;
    }

    private void MaximizeClick(object? sender, RoutedEventArgs e)
    {
        WindowState = WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;
    }

    private void CloseClick(object? sender, RoutedEventArgs e)
    {
        Close();
    }

    // Allow double-click on title bar to maximize/restore
    protected override void OnPointerPressed(PointerPressedEventArgs e)
    {
        base.OnPointerPressed(e);
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
        {
            // Check if click is in title bar area (top 40px)
            var pos = e.GetPosition(this);
            if (pos.Y < 40)
            {
                if (e.ClickCount == 2)
                {
                    WindowState = WindowState == WindowState.Maximized
                        ? WindowState.Normal
                        : WindowState.Maximized;
                }
                else
                {
                    BeginMoveDrag(e);
                }
            }
        }
    }
}

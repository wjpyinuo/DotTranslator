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
        // 最小化到托盘而非退出（托盘功能 Week 3 实现）
        // TODO: Week 3 改为 Hide() + TrayIcon
        Close();
    }
}

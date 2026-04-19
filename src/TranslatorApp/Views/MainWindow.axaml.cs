using Avalonia.Controls;
using Avalonia.Input;
using Avalonia.Interactivity;
using Avalonia.Markup.Xaml;
using TranslatorApp.ViewModels;

namespace TranslatorApp.Views;

public partial class MainWindow : Window
{
    private MainViewModel ViewModel => (MainViewModel)DataContext!;

    public MainWindow()
    {
        InitializeComponent();

        // 拖拽区域
        var titleBar = this.FindControl<Grid>("TitleBar");
        if (titleBar != null)
            titleBar.PointerPressed += TitleBar_PointerPressed;
    }

    private void InitializeComponent()
    {
        AvaloniaXamlLoader.Load(this);
    }

    private void TitleBar_PointerPressed(object? sender, PointerPressedEventArgs e)
    {
        if (e.GetCurrentPoint(this).Properties.IsLeftButtonPressed)
            BeginMoveDrag(e);
    }

    private void MinimizeClick(object? sender, RoutedEventArgs e)
        => WindowState = WindowState.Minimized;

    private void MaximizeClick(object? sender, RoutedEventArgs e)
        => WindowState = WindowState == WindowState.Maximized
            ? WindowState.Normal
            : WindowState.Maximized;

    private void CloseClick(object? sender, RoutedEventArgs e)
        => Close();

    /// <summary>侧边栏导航点击</summary>
    private void NavItemClick(object? sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.CommandParameter is string pageKey)
        {
            ViewModel.SelectPage(pageKey);
        }
    }
}

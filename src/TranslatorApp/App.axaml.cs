using System.Collections.ObjectModel;
using System.Text.Json;
using Avalonia;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Microsoft.Extensions.DependencyInjection;
using TranslatorApp.ViewModels;
using TranslatorApp.Views;

namespace TranslatorApp;

public partial class App : Application
{
    public IServiceProvider Services { get; private set; } = null!;

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // DI 容器
            var services = new ServiceCollection();
            services.AddCoreServices();
            services.AddAppServices();
            Services = services.BuildServiceProvider();

            // 主窗口
            var vm = Services.GetRequiredService<MainViewModel>();
            vm.Initialize();
            desktop.MainWindow = new MainWindow { DataContext = vm };
        }

        base.OnFrameworkInitializationCompleted();
    }
}

/// <summary>DI 注册扩展</summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        // W2: 注册翻译引擎、TTS、存储、弹性策略等
        // services.AddSingleton<ITranslationProvider, HuoshanProvider>();
        // services.AddSingleton<TranslationManager>();
        // services.AddSingleton<TranslationRouter>();
        // services.AddSingleton<TranslationCache>();
        return services;
    }

    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        services.AddSingleton<MainViewModel>();
        // W3: services.AddSingleton<SettingsViewModel>();
        // W6: services.AddSingleton<HistoryViewModel>();
        return services;
    }
}

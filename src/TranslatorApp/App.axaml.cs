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
            services.AddCoreServices();   // Translator.Core 服务注册
            services.AddAppServices();    // App 层服务注册
            Services = services.BuildServiceProvider();

            // 主窗口
            desktop.MainWindow = new MainWindow
            {
                DataContext = Services.GetRequiredService<MainViewModel>()
            };
        }

        base.OnFrameworkInitializationCompleted();
    }
}

/// <summary>DI 注册扩展</summary>
public static class ServiceCollectionExtensions
{
    public static IServiceCollection AddCoreServices(this IServiceCollection services)
    {
        // TODO: 注册翻译引擎、TTS、存储、弹性策略等
        // services.AddSingleton<ITranslationProvider, HuoshanProvider>();
        // services.AddSingleton<TranslationManager>();
        // services.AddSingleton<TranslationRouter>();
        // services.AddSingleton<TranslationCache>();
        return services;
    }

    public static IServiceCollection AddAppServices(this IServiceCollection services)
    {
        services.AddSingleton<MainViewModel>();
        // services.AddSingleton<SettingsViewModel>();
        // services.AddSingleton<HistoryViewModel>();
        return services;
    }
}

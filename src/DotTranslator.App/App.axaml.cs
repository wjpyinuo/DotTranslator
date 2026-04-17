using Avalonia;
using Avalonia.Controls;
using Avalonia.Controls.ApplicationLifetimes;
using Avalonia.Markup.Xaml;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using DotTranslator.Core.Translation;
using DotTranslator.Core.Translation.Providers;
using DotTranslator.Core.History;
using DotTranslator.Core.Security;
using DotTranslator.Core.Telemetry;
using DotTranslator.Infrastructure.Data;
using DotTranslator.Infrastructure.Http;
using DotTranslator.Infrastructure.Update;
using DotTranslator.App.ViewModels;
using DotTranslator.App.Views;
using DotTranslator.App.Platform.Windows;
using DotTranslator.Shared.Constants;
using System;
using System.IO;

namespace DotTranslator.App;

public partial class App : Application
{
    public static IServiceProvider Services { get; private set; } = null!;
    public static ServiceProvider? ServiceProvider { get; private set; }

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            var services = new ServiceCollection();
            ConfigureServices(services);
            ServiceProvider = services.BuildServiceProvider();
            Services = ServiceProvider;

            var dbPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "DotTranslator", AppConstants.DbFile);
            var dbDir = Path.GetDirectoryName(dbPath);
            if (dbDir != null && !Directory.Exists(dbDir)) Directory.CreateDirectory(dbDir);

            var context = new AppDbContext(dbPath);
            context.InitializeDatabase();
            services.AddSingleton(context);

            var repo = new SqliteRepository(context);
            services.AddSingleton<IHistoryRepository>(repo);
            services.AddSingleton<ITranslationMemory>(repo);

            var mainWindowVm = ServiceProvider.GetRequiredService<MainWindowViewModel>();
            desktop.MainWindow = new MainWindow { DataContext = mainWindowVm };

            // Start local API server
            var localApi = ServiceProvider.GetRequiredService<LocalApiServer>();
            localApi.Start();

            // Start telemetry
            var telemetry = ServiceProvider.GetRequiredService<TelemetryReporter>();
            var instanceId = repo.GetSetting("instanceId") ?? Guid.NewGuid().ToString();
            repo.SetSetting("instanceId", instanceId);
            telemetry.Start(instanceId, false);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private void ConfigureServices(IServiceCollection services)
    {
        services.AddLogging(b => b.AddConsole());

        // HTTP clients for translation providers
        services.AddHttpClient("DeepL", c => c.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient("Youdao", c => c.Timeout = TimeSpan.FromSeconds(15));
        services.AddHttpClient("Baidu", c => c.Timeout = TimeSpan.FromSeconds(15));

        // Translation providers
        services.AddSingleton<DeepLProvider>();
        services.AddSingleton<YoudaoProvider>();
        services.AddSingleton<BaiduProvider>();
        services.AddSingleton<FallbackProvider>();
        services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<DeepLProvider>());
        services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<YoudaoProvider>());
        services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<BaiduProvider>());
        services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<FallbackProvider>());

        services.AddSingleton<TranslationRouter>();
        services.AddSingleton<HistoryService>();
        services.AddSingleton<TelemetryReporter>();

        // ApiKeyVault
        var vaultPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
            "DotTranslator", "encrypted_keys.dat");
        services.AddSingleton(new ApiKeyVault(vaultPath));

        // Local API
        services.AddSingleton<LocalApiServer>();

        // Auto updater
        services.AddSingleton(new AutoUpdater("wjpyinuo", "DotTranslator",
            services.BuildServiceProvider().GetRequiredService<ILogger<AutoUpdater>>()));

        // ViewModels
        services.AddTransient<MainWindowViewModel>();
        services.AddTransient<TranslationViewModel>();
        services.AddTransient<SettingsViewModel>();
        services.AddTransient<HistoryViewModel>();
    }

    public static void SwitchTheme(string theme)
    {
        if (Current == null) return;
        Current.RequestedThemeVariant = theme switch
        {
            "dark" => Avalonia.Styling.ThemeVariant.Dark,
            "light" => Avalonia.Styling.ThemeVariant.Light,
            _ => Avalonia.Styling.ThemeVariant.Default
        };
    }
}

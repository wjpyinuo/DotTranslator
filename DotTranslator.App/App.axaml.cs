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

    public override void Initialize()
    {
        AvaloniaXamlLoader.Load(this);
    }

    public override void OnFrameworkInitializationCompleted()
    {
        if (ApplicationLifetime is IClassicDesktopStyleApplicationLifetime desktop)
        {
            // 1. Database
            var dbPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "DotTranslator", AppConstants.DbFile);
            var dbDir = Path.GetDirectoryName(dbPath);
            if (dbDir != null && !Directory.Exists(dbDir)) Directory.CreateDirectory(dbDir);

            var context = new AppDbContext(dbPath);
            context.InitializeDatabase();

            var repo = new SqliteRepository(context);

            // 2. Register ALL services
            var services = new ServiceCollection();
            services.AddLogging(b => b.AddConsole());

            services.AddSingleton(context);
            services.AddSingleton<IHistoryRepository>(repo);
            services.AddSingleton<ITranslationMemory>(repo);
            services.AddSingleton(repo);

            // HTTP clients
            services.AddHttpClient("DeepL", c => c.Timeout = TimeSpan.FromSeconds(15));
            services.AddHttpClient("Youdao", c => c.Timeout = TimeSpan.FromSeconds(15));
            services.AddHttpClient("Baidu", c => c.Timeout = TimeSpan.FromSeconds(15));

            // Providers
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
            services.AddSingleton(sp => new AutoUpdater("wjpyinuo", "DotTranslator",
                sp.GetRequiredService<ILogger<AutoUpdater>>()));

            // ViewModels
            services.AddTransient<MainWindowViewModel>();
            services.AddTransient<TranslationViewModel>();
            services.AddSingleton<SettingsViewModel>();
            services.AddSingleton<HistoryViewModel>();

            // 3. Build provider ONCE
            Services = services.BuildServiceProvider();

            // 4. Restore API keys from vault
            var vault = Services.GetRequiredService<ApiKeyVault>();
            var deepL = Services.GetRequiredService<DeepLProvider>();
            var deeplKey = vault.Get("deeplApiKey");
            if (!string.IsNullOrEmpty(deeplKey)) deepL.SetApiKey(deeplKey);

            var youdao = Services.GetRequiredService<YoudaoProvider>();
            var ydAppId = vault.Get("youdaoAppId");
            var ydSecret = vault.Get("youdaoAppSecret");
            if (!string.IsNullOrEmpty(ydAppId) && !string.IsNullOrEmpty(ydSecret))
                youdao.SetCredentials(ydAppId, ydSecret);

            var baidu = Services.GetRequiredService<BaiduProvider>();
            var bdAppId = vault.Get("baiduAppId");
            var bdSecret = vault.Get("baiduSecretKey");
            if (!string.IsNullOrEmpty(bdAppId) && !string.IsNullOrEmpty(bdSecret))
                baidu.SetCredentials(bdAppId, bdSecret);

            // 5. Create main window
            var mainWindowVm = Services.GetRequiredService<MainWindowViewModel>();
            desktop.MainWindow = new MainWindow { DataContext = mainWindowVm };

            // 6. Start services
            var localApi = Services.GetRequiredService<LocalApiServer>();
            localApi.Start();

            var telemetry = Services.GetRequiredService<TelemetryReporter>();
            var instanceId = repo.GetSetting("instanceId") ?? Guid.NewGuid().ToString();
            repo.SetSetting("instanceId", instanceId);
            telemetry.Start(instanceId, false);
        }

        base.OnFrameworkInitializationCompleted();
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

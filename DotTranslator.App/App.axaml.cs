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
using DotTranslator.Infrastructure.Security;
using DotTranslator.Core.Settings;
using DotTranslator.Core.Stats;
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
            var settingsRepo = new SqliteSettingsRepository(context);
            var statsRepo = new SqliteStatsRepository(context);
            var metricsRepo = new SqliteMetricsRepository(context);

            // 2. Register ALL services
            var services = new ServiceCollection();
            services.AddLogging(b => b.AddConsole());

            services.AddSingleton(context);
            services.AddSingleton<IHistoryRepository>(repo);
            services.AddSingleton<ITranslationMemory>(repo);
            services.AddSingleton<ISettingsRepository>(settingsRepo);
            services.AddSingleton<IStatsRepository>(statsRepo);
            services.AddSingleton<IMetricsRepository>(metricsRepo);

            // HTTP clients (one per provider)
            var providerNames = new[] {
                "DeepL", "Baidu", "Youdao", "Microsoft", "Amazon",
                "Alibaba", "Tencent", "Niutrans", "Caiyun", "VolcEngine", "IFlytek"
            };
            foreach (var name in providerNames)
                services.AddHttpClient(name, c => c.Timeout = TimeSpan.FromSeconds(15));

            // Translation providers — auto-discovered via reflection
            var providerAssembly = typeof(ITranslationProvider).Assembly;
            var providerTypes = providerAssembly.GetTypes()
                .Where(t => typeof(ITranslationProvider).IsAssignableFrom(t)
                            && t is { IsInterface: false, IsAbstract: false });

            foreach (var type in providerTypes)
            {
                services.AddSingleton(type);
                services.AddSingleton<ITranslationProvider>(sp => (ITranslationProvider)sp.GetRequiredService(type));
            }

            services.AddSingleton<TranslationRouter>();
            services.AddSingleton<ITranslationService>(sp => sp.GetRequiredService<TranslationRouter>());
            services.AddSingleton<HistoryService>();
            services.AddSingleton<TelemetryReporter>();

            // ApiKeyVault
            var vaultPath = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "DotTranslator", "encrypted_keys.dat");
            var vault = new ApiKeyVault(vaultPath);
            services.AddSingleton(vault);
            services.AddSingleton<IApiKeyStore>(vault);

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

            // 4. Restore API keys from vault → apply to providers
            RestoreCredentials(vault);

            // 5. Create main window
            var mainWindowVm = Services.GetRequiredService<MainWindowViewModel>();
            desktop.MainWindow = new MainWindow { DataContext = mainWindowVm };

            // 6. Start services
            var localApi = Services.GetRequiredService<LocalApiServer>();
            localApi.Start();

            var telemetry = Services.GetRequiredService<TelemetryReporter>();
            var instanceId = settingsRepo.GetSetting("instanceId") ?? Guid.NewGuid().ToString();
            settingsRepo.SetSetting("instanceId", instanceId);
            telemetry.Start(instanceId, false);
        }

        base.OnFrameworkInitializationCompleted();
    }

    private static void RestoreCredentials(IApiKeyStore vault)
    {
        var v = (string key) => vault.Get(key) ?? "";

        // DeepL
        var deeplKey = v("deeplApiKey");
        if (!string.IsNullOrEmpty(deeplKey))
            Services.GetRequiredService<DeepLProvider>().SetApiKey(deeplKey);

        // Baidu
        var bdAppId = v("baiduAppId");
        var bdSecret = v("baiduSecretKey");
        if (!string.IsNullOrEmpty(bdAppId) && !string.IsNullOrEmpty(bdSecret))
            Services.GetRequiredService<BaiduProvider>().SetCredentials(bdAppId, bdSecret);

        // Youdao
        var ydAppId = v("youdaoAppId");
        var ydSecret = v("youdaoAppSecret");
        if (!string.IsNullOrEmpty(ydAppId) && !string.IsNullOrEmpty(ydSecret))
            Services.GetRequiredService<YoudaoProvider>().SetCredentials(ydAppId, ydSecret);

        // Microsoft
        var msKey = v("microsoftApiKey");
        var msRegion = v("microsoftRegion");
        if (!string.IsNullOrEmpty(msKey))
            Services.GetRequiredService<MicrosoftProvider>().SetCredentials(msKey, msRegion);

        // Amazon
        var awsKey = v("amazonAccessKeyId");
        var awsSecret = v("amazonSecretAccessKey");
        var awsRegion = v("amazonRegion");
        if (!string.IsNullOrEmpty(awsKey) && !string.IsNullOrEmpty(awsSecret))
            Services.GetRequiredService<AmazonProvider>().SetCredentials(awsKey, awsSecret, awsRegion);

        // Alibaba
        var aliKey = v("alibabaAccessKeyId");
        var aliSecret = v("alibabaAccessKeySecret");
        if (!string.IsNullOrEmpty(aliKey) && !string.IsNullOrEmpty(aliSecret))
            Services.GetRequiredService<AlibabaProvider>().SetCredentials(aliKey, aliSecret);

        // Tencent
        var txId = v("tencentSecretId");
        var txKey = v("tencentSecretKey");
        var txRegion = v("tencentRegion");
        if (!string.IsNullOrEmpty(txId) && !string.IsNullOrEmpty(txKey))
            Services.GetRequiredService<TencentProvider>().SetCredentials(txId, txKey, txRegion);

        // Niutrans
        var ntKey = v("niutransApiKey");
        if (!string.IsNullOrEmpty(ntKey))
            Services.GetRequiredService<NiutransProvider>().SetApiKey(ntKey);

        // Caiyun
        var cyToken = v("caiyunToken");
        if (!string.IsNullOrEmpty(cyToken))
            Services.GetRequiredService<CaiyunProvider>().SetToken(cyToken);

        // VolcEngine
        var veKey = v("volcengineAccessKeyId");
        var veSecret = v("volcengineSecretAccessKey");
        var veRegion = v("volcengineRegion");
        if (!string.IsNullOrEmpty(veKey) && !string.IsNullOrEmpty(veSecret))
            Services.GetRequiredService<VolcEngineProvider>().SetCredentials(veKey, veSecret, veRegion);

        // iFLYTEK
        var iflyAppId = v("iflytekAppId");
        var iflyApiKey = v("iflytekApiKey");
        var iflyApiSecret = v("iflytekApiSecret");
        if (!string.IsNullOrEmpty(iflyAppId) && !string.IsNullOrEmpty(iflyApiKey) && !string.IsNullOrEmpty(iflyApiSecret))
            Services.GetRequiredService<IFlytekProvider>().SetCredentials(iflyAppId, iflyApiKey, iflyApiSecret);
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

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

            // HTTP clients (one per provider)
            var providerNames = new[] {
                "DeepL", "Baidu", "Youdao", "Microsoft", "Amazon",
                "Alibaba", "Tencent", "Niutrans", "Caiyun", "VolcEngine", "IFlytek"
            };
            foreach (var name in providerNames)
                services.AddHttpClient(name, c => c.Timeout = TimeSpan.FromSeconds(15));

            // Translation providers (as concrete types for DI)
            services.AddSingleton<DeepLProvider>();
            services.AddSingleton<BaiduProvider>();
            services.AddSingleton<YoudaoProvider>();
            services.AddSingleton<MicrosoftProvider>();
            services.AddSingleton<AmazonProvider>();
            services.AddSingleton<AlibabaProvider>();
            services.AddSingleton<TencentProvider>();
            services.AddSingleton<NiutransProvider>();
            services.AddSingleton<CaiyunProvider>();
            services.AddSingleton<VolcEngineProvider>();
            services.AddSingleton<IFlytekProvider>();
            services.AddSingleton<FallbackProvider>();

            // Also register as ITranslationProvider
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<DeepLProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<BaiduProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<YoudaoProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<MicrosoftProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<AmazonProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<AlibabaProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<TencentProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<NiutransProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<CaiyunProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<VolcEngineProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<IFlytekProvider>());
            services.AddSingleton<ITranslationProvider>(sp => sp.GetRequiredService<FallbackProvider>());

            services.AddSingleton<TranslationRouter>();
            services.AddSingleton<ITranslationService>(sp => sp.GetRequiredService<TranslationRouter>());
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

            // 4. Restore API keys from vault → apply to providers
            var vault = Services.GetRequiredService<ApiKeyVault>();
            RestoreCredentials(vault);

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

    private static void RestoreCredentials(ApiKeyVault vault)
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

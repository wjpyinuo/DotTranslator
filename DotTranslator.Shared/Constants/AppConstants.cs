namespace DotTranslator.Shared.Constants;

public static class AppConstants
{
    public const string AppVersion = "1.0.0";
    public const string AppName = "DotTranslator";
    public const string AppId = "com.dottranslator.app";
    public const string DbFile = "dottranslator.db";

    public const int MaxTranslationLength = 50_000;
    public const int DefaultTranslationTimeoutMs = 10_000;
    public const int ClipboardPollIntervalMs = 500;

    public const int CircuitBreakerFailureThreshold = 5;
    public const int CircuitBreakerCooldownMs = 30_000;

    public const double ScoringWeightErrorRate = 0.5;
    public const double ScoringWeightCost = 0.3;
    public const double ScoringWeightAvailability = 0.2;

    public const int LocalApiPortStart = 18000;
    public const int LocalApiPortEnd = 18100;

    public static readonly HashSet<string> AllowedAnnouncementHosts = new()
    {
        "raw.githubusercontent.com",
        "gist.githubusercontent.com",
        "cdn.jsdelivr.net",
        "unpkg.com"
    };
}

public static class FeatureNames
{
    public const string TranslateManual = "translate_manual";
    public const string TranslateClipboard = "translate_clipboard";
    public const string TranslateOcr = "translate_ocr";
    public const string OcrScreenshot = "ocr_screenshot";
    public const string TtsSpeak = "tts_speak";
    public const string HistoryExport = "history_export";
    public const string PiPShow = "pip_show";
    public const string PrivacyModeOn = "privacy_mode_on";
}

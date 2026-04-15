// ==================== 翻译相关 ====================

export interface TranslateParams {
  text: string;
  sourceLang: string; // ISO 639-1, 'auto'
  targetLang: string;
  context?: string;
  glossaryId?: string;
}

export interface TranslateResult {
  text: string;
  alternatives?: string[];
  detectedSourceLang?: string;
  provider: string;
  confidence: number; // 0-1
  latencyMs: number;
}

export interface LanguageDetection {
  language: string;
  confidence: number;
}

export interface UsageStats {
  totalCalls: number;
  totalChars: number;
  remainingQuota?: number;
}

export interface TranslationProvider {
  readonly id: string;
  readonly name: string;
  readonly supportedLanguages: LanguagePair[];
  readonly maxTextLength: number;
  readonly requiresApiKey: boolean;

  translate(params: TranslateParams): Promise<TranslateResult>;
  detectLanguage(text: string): Promise<LanguageDetection>;
  isAvailable(): Promise<boolean>;
  getUsageStats(): Promise<UsageStats>;
}

export interface LanguagePair {
  source: string;
  target: string;
}

// ==================== 历史记录 ====================

export interface HistoryEntry {
  id: string;
  sourceText: string;
  targetText: string;
  sourceLang: string;
  targetLang: string;
  provider: string;
  isFavorite: boolean;
  createdAt: number;
}

// ==================== TM 精确匹配 ====================

export interface TMEntry {
  id: string;
  sourceLang: string;
  targetLang: string;
  sourceText: string;
  targetText: string;
  usageCount: number;
  createdAt: number;
}

// ==================== 遥测 ====================

export type FeatureName =
  | 'translate_manual'
  | 'translate_clipboard'
  | 'translate_ocr'
  | 'comparison_view'
  | 'pip_window'
  | 'tts_play'
  | 'api_called'
  | 'theme_switch'
  | 'privacy_mode_on'
  | 'glossary_import'
  | 'tm_import'
  | 'tm_match_hit'
  | 'error_occurred';

export interface HeartbeatEvent {
  type: 'heartbeat';
  timestamp: number;
  payload: {
    instanceId: string;
    version: string;
    os: string;
    osVersion: string;
    arch: string;
    locale: string;
    theme: string;
    activeProviders: string[];
    privacyMode: boolean;
    sessionDurationSec: number;
  };
}

export interface FeatureEvent {
  type: 'feature';
  timestamp: number;
  payload: {
    instanceId: string;
    version: string;
    feature: FeatureName;
    metadata?: Record<string, string | number>;
  };
}

export type TelemetryEvent = HeartbeatEvent | FeatureEvent;

// ==================== 用户设置 ====================

export interface UserSettings {
  theme: 'light' | 'dark';
  defaultSourceLang: string;
  defaultTargetLang: string;
  defaultProvider: string;
  enabledProviders: string[];
  clipboardMonitor: boolean;
  telemetryEnabled: boolean;
  privacyMode: boolean;
  hotkey: string;
  serverUrl?: string;
  serverToken?: string;
  deeplApiKey?: string;
  baiduAppId?: string;
  baiduSecretKey?: string;
}

// ==================== 本地统计 ====================

export interface LocalStatsRecord {
  id: string;
  feature: FeatureName;
  provider?: string;
  sourceLang?: string;
  targetLang?: string;
  charCount?: number;
  latencyMs?: number;
  tmHit: boolean;
  createdAt: number;
}

// ==================== UI ====================

export type ViewMode = 'main' | 'mini' | 'pip';

export interface AppState {
  currentView: ViewMode;
  isTranslating: boolean;
  inputText: string;
  sourceLang: string;
  targetLang: string;
  selectedProvider: string;
}

// ==================== 翻译相关 ====================

export interface TranslateParams {
  text: string;
  sourceLang: string; // ISO 639-1, 'auto'
  targetLang: string;
  context?: string;
  glossaryId?: string;
  /** 可选的 AbortSignal，用于取消底层 HTTP 请求 */
  signal?: AbortSignal;
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
  youdaoAppId?: string;
  youdaoAppSecret?: string;
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

// ==================== 术语库（Phase 2 预留） ====================

export interface TermMatch {
  source: string;
  target: string;
  start: number;
  end: number;
  glossaryId: string;
}

export interface GlossaryEngine {
  // Phase 1: 返回空数组（不启用）
  // Phase 2: 返回匹配的术语标注
  matchTerms(text: string, glossaryId: string): Promise<TermMatch[]>;
  importTBX(file: Buffer, glossaryId: string): Promise<{ imported: number; skipped: number }>;
}

// Stub 实现
export class StubGlossaryEngine implements GlossaryEngine {
  async matchTerms(): Promise<TermMatch[]> {
    return []; // Phase 2 实现
  }
  async importTBX(): Promise<{ imported: number; skipped: number }> {
    return { imported: 0, skipped: 0 };
  }
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

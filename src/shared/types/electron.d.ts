interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: string;
  enabledProviders?: string[];
}

interface TranslateResultItem {
  text: string;
  provider: string;
  confidence: number;
  latencyMs: number;
  detectedSourceLang?: string;
  tmHit?: boolean;
}

interface ElectronAPI {
  window: {
    minimize(): void;
    close(): void;
    toggleMaximize(): void;
  };
  app: {
    quit(): void;
  };
  pip: {
    show(data: { text: string; sourceLang: string; targetLang: string }): void;
    hide(): void;
    close(): void;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  clipboard: {
    readText(): Promise<string>;
    onClipboardChange(callback: (text: string) => void): void;
    setMonitor(enabled: boolean): void;
  };
  translation: {
    translate(params: TranslateParams): Promise<TranslateResultItem[]>;
    getProviders(): Promise<unknown>;
    detectLanguage(text: string): Promise<unknown>;
  };
  ocr: {
    recognize(imageBase64: string): Promise<unknown>;
  };
  history: {
    getAll(limit?: number): Promise<unknown>;
    search(query: string): Promise<unknown>;
    addFavorite(id: string): Promise<void>;
    removeFavorite(id: string): Promise<void>;
  };
  tm: {
    lookup(text: string, sourceLang: string, targetLang: string): Promise<unknown>;
  };
  stats: {
    get(): Promise<StatsData>;
  };
  announcement: {
    fetch(url: string): Promise<string>;
  };
}

interface StatsData {
  totalTranslations: number;
  totalChars: number;
  avgLatency: number;
  providerDistribution: Record<string, number>;
  topLanguagePairs: { pair: string; count: number }[];
  tmHitRate: number;
}

interface Window {
  electronAPI?: ElectronAPI;
}

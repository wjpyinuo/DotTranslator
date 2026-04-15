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
  secureStorage: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
    isAvailable(): Promise<boolean>;
  };
  pip: {
    show(data: { text: string; sourceLang: string; targetLang: string }): void;
    hide(): void;
    close(): void;
  };
  floating: {
    update(text: string): void;
    hide(): void;
    show(): void;
    onRequestLastResult(callback: () => void): void;
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
    screenshot(): Promise<{ imageBase64: string; width: number; height: number }>;
    onTrigger(callback: () => void): void;
  };
  history: {
    getAll(limit?: number): Promise<unknown>;
    search(query: string): Promise<unknown>;
    addFavorite(id: string): Promise<void>;
    removeFavorite(id: string): Promise<void>;
  };
  tm: {
    lookup(text: string, sourceLang: string, targetLang: string): Promise<unknown>;
    insert(text: string, targetText: string, sourceLang: string, targetLang: string): Promise<void>;
  };
  stats: {
    get(): Promise<StatsData>;
  };
  announcement: {
    fetch(url: string): Promise<string>;
    readLocal(filename: string): Promise<string>;
    writeLocal(filename: string, content: string): Promise<boolean>;
  };
  localApi: {
    getToken(): Promise<string>;
  };
  _internal?: {
    send(channel: string, ...args: unknown[]): void;
    on(channel: string, callback: (...args: unknown[]) => void): void;
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

interface ElectronAPI {
  window: {
    minimize(): void;
    close(): void;
    toggleMaximize(): void;
  };
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
  };
  clipboard: {
    readText(): Promise<string>;
    onClipboardChange(callback: (text: string) => void): void;
  };
  translation: {
    translate(params: { text: string; sourceLang: string; targetLang: string; provider?: string }): Promise<unknown>;
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
    get(): Promise<unknown>;
  };
}

interface Window {
  electronAPI?: ElectronAPI;
}

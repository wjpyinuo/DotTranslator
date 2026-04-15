import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TranslateResult, HistoryEntry, UserSettings, ViewMode } from '@shared/types';

interface AppStore {
  // UI 状态
  currentView: ViewMode;
  isTranslating: boolean;
  showSettings: boolean;

  // 输入
  inputText: string;
  sourceLang: string;
  targetLang: string;
  selectedProvider: string;

  // 翻译结果
  results: TranslateResult[];

  // 历史
  history: HistoryEntry[];

  // 设置
  settings: UserSettings;

  // Actions
  setCurrentView: (view: ViewMode) => void;
  setInputText: (text: string) => void;
  setSourceLang: (lang: string) => void;
  setTargetLang: (lang: string) => void;
  setSelectedProvider: (provider: string) => void;
  setResults: (results: TranslateResult[]) => void;
  addResult: (result: TranslateResult) => void;
  setTranslating: (loading: boolean) => void;
  setHistory: (history: HistoryEntry[]) => void;
  addToHistory: (entry: HistoryEntry) => void;
  updateSettings: (settings: Partial<UserSettings>) => void;
  toggleSettings: () => void;
  swapLanguages: () => void;
  clearResults: () => void;
}

export const useAppStore = create<AppStore>()(
  immer((set) => ({
    currentView: 'main',
    isTranslating: false,
    showSettings: false,
    inputText: '',
    sourceLang: 'auto',
    targetLang: 'zh',
    selectedProvider: '',
    results: [],
    history: [],
    settings: {
      theme: 'dark',
      defaultSourceLang: 'auto',
      defaultTargetLang: 'zh',
      defaultProvider: '',
      enabledProviders: ['deepl', 'google'],
      clipboardMonitor: true,
      telemetryEnabled: true,
      privacyMode: false,
      hotkey: 'Alt+Space',
    },

    setCurrentView: (view) => set((s) => { s.currentView = view; }),
    setInputText: (text) => set((s) => { s.inputText = text; }),
    setSourceLang: (lang) => set((s) => { s.sourceLang = lang; }),
    setTargetLang: (lang) => set((s) => { s.targetLang = lang; }),
    setSelectedProvider: (provider) => set((s) => { s.selectedProvider = provider; }),
    setResults: (results) => set((s) => { s.results = results; }),
    addResult: (result) => set((s) => { s.results.push(result); }),
    setTranslating: (loading) => set((s) => { s.isTranslating = loading; }),
    setHistory: (history) => set((s) => { s.history = history; }),
    addToHistory: (entry) => set((s) => { s.history.unshift(entry); }),
    updateSettings: (partial) =>
      set((s) => {
        Object.assign(s.settings, partial);
      }),
    toggleSettings: () => set((s) => { s.showSettings = !s.showSettings; }),
    swapLanguages: () =>
      set((s) => {
        if (s.sourceLang !== 'auto') {
          const temp = s.sourceLang;
          s.sourceLang = s.targetLang;
          s.targetLang = temp;
        }
      }),
    clearResults: () => set((s) => { s.results = []; }),
  }))
);

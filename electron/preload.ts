import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  },

  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: unknown) => ipcRenderer.invoke('storage:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('storage:delete', key),
  },

  clipboard: {
    readText: () => ipcRenderer.invoke('clipboard:readText'),
    onClipboardChange: (callback: (text: string) => void) => {
      ipcRenderer.on('clipboard:changed', (_event, text) => callback(text));
    },
  },

  translation: {
    translate: (params: TranslateParams) => ipcRenderer.invoke('translation:translate', params),
    getProviders: () => ipcRenderer.invoke('translation:getProviders'),
    detectLanguage: (text: string) => ipcRenderer.invoke('translation:detectLanguage', text),
  },

  ocr: {
    recognize: (imageBase64: string) => ipcRenderer.invoke('ocr:recognize', imageBase64),
  },

  history: {
    getAll: (limit?: number) => ipcRenderer.invoke('history:getAll', limit),
    search: (query: string) => ipcRenderer.invoke('history:search', query),
    addFavorite: (id: string) => ipcRenderer.invoke('history:addFavorite', id),
    removeFavorite: (id: string) => ipcRenderer.invoke('history:removeFavorite', id),
  },

  tm: {
    lookup: (text: string, sourceLang: string, targetLang: string) =>
      ipcRenderer.invoke('tm:lookup', text, sourceLang, targetLang),
  },

  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },
});

interface TranslateParams {
  text: string;
  sourceLang: string;
  targetLang: string;
  provider?: string;
}

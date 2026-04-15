import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  },

  app: {
    quit: () => ipcRenderer.send('app:quit'),
  },

  secureStorage: {
    get: (key: string) => ipcRenderer.invoke('secure-storage:get', key),
    set: (key: string, value: string) => ipcRenderer.invoke('secure-storage:set', key, value),
    delete: (key: string) => ipcRenderer.invoke('secure-storage:delete', key),
    isAvailable: () => ipcRenderer.invoke('secure-storage:is-available'),
  },

  pip: {
    show: (data: { text: string; sourceLang: string; targetLang: string }) => ipcRenderer.send('pip:show', data),
    hide: () => ipcRenderer.send('pip:hide'),
    close: () => ipcRenderer.send('pip:close'),
  },

  floating: {
    update: (text: string) => ipcRenderer.send('floating:update', text),
    hide: () => ipcRenderer.send('floating:hide'),
    show: () => ipcRenderer.send('floating:show'),
    onRequestLastResult: (callback: () => void) => {
      ipcRenderer.on('floating:request-last-result', () => callback());
    },
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
    setMonitor: (enabled: boolean) => ipcRenderer.send('clipboard:monitor-toggle', enabled),
  },

  translation: {
    translate: (params: { text: string; sourceLang: string; targetLang: string; enabledProviders?: string[] }) =>
      ipcRenderer.invoke('translation:translate', params),
    getProviders: () => ipcRenderer.invoke('translation:getProviders'),
    detectLanguage: (text: string) => ipcRenderer.invoke('translation:detectLanguage', text),
  },

  ocr: {
    recognize: (imageBase64: string) => ipcRenderer.invoke('ocr:recognize', imageBase64),
    screenshot: () => ipcRenderer.invoke('ocr:screenshot'),
    onTrigger: (callback: () => void) => {
      ipcRenderer.on('ocr:trigger', () => callback());
    },
  },

  history: {
    getAll: (limit?: number) => ipcRenderer.invoke('history:getAll', limit),
    add: (entry: { sourceText: string; targetText: string; sourceLang: string; targetLang: string; provider: string; isFavorite?: boolean }) => ipcRenderer.invoke('history:add', entry),
    search: (query: string) => ipcRenderer.invoke('history:search', query),
    addFavorite: (id: string) => ipcRenderer.invoke('history:addFavorite', id),
    removeFavorite: (id: string) => ipcRenderer.invoke('history:removeFavorite', id),
  },

  tm: {
    lookup: (text: string, sourceLang: string, targetLang: string) =>
      ipcRenderer.invoke('tm:lookup', text, sourceLang, targetLang),
    insert: (text: string, targetText: string, sourceLang: string, targetLang: string) =>
      ipcRenderer.invoke('tm:insert', text, targetText, sourceLang, targetLang),
  },

  stats: {
    get: () => ipcRenderer.invoke('stats:get'),
  },

  announcement: {
    fetch: (url: string) => ipcRenderer.invoke('announcement:fetch', url),
    readLocal: (filename: string) => ipcRenderer.invoke('announcement:readLocal', filename),
    writeLocal: (filename: string, content: string) => ipcRenderer.invoke('announcement:writeLocal', filename, content),
  },

  localApi: {
    getToken: () => ipcRenderer.invoke('local-api:token'),
  },

  // 内部辅助窗口用（悬浮球/迷你卡片/PiP）
  _internal: {
    send: (channel: string, ...args: unknown[]) => ipcRenderer.send(channel, ...args),
    on: (channel: string, callback: (...args: unknown[]) => void) => {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    },
  },
});

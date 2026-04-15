import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    close: () => ipcRenderer.send('window:close'),
    toggleMaximize: () => ipcRenderer.send('window:toggle-maximize'),
  },
});

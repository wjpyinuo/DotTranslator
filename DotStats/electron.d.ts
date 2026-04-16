interface DotStatsElectronAPI {
  window: {
    minimize: () => void;
    toggleMaximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    onMaximizeChanged: (callback: (maximized: boolean) => void) => void;
  };
}

interface Window {
  electronAPI?: DotStatsElectronAPI;
}

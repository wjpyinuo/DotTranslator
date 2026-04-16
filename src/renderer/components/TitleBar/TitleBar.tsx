import { useState, useEffect } from 'react';
import { APP_VERSION } from '@shared/constants';
import { useAppStore } from '@renderer/stores/appStore';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.window) return;

    // 获取初始最大化状态
    api.window.isMaximized().then(setIsMaximized);

    // 监听最大化状态变化
    if (api.window.onMaximizeChanged) {
      api.window.onMaximizeChanged(setIsMaximized);
    }
  }, []);

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="title">
          <svg className="title-icon" width="20" height="20" viewBox="0 0 32 32" style={{ display: 'inline' }}>
            <defs>
              <linearGradient id="titleIconGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#818cf8"/>
                <stop offset="100%" stopColor="#6366f1"/>
              </linearGradient>
            </defs>
            <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#titleIconGrad)"/>
            <text x="9" y="14" fontSize="11" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">A</text>
            <text x="17" y="25" fontSize="11" fontWeight="bold" fill="rgba(255,255,255,0.85)" fontFamily="Arial,sans-serif">文</text>
            <path d="M14 5 L19 8.5 L14 12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 20 L7 23.5 L12 27" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="title-name">DotTranslator</span>
          <span className="title-version">v{APP_VERSION}</span>
        </span>
      </div>
      <div className="titlebar-controls">
        {/* 主题切换 */}
        <button
          className={`titlebar-theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
          onClick={() => {
            updateSettings({ theme: 'light' });
            window.electronAPI?._internal?.send('theme:changed', 'light');
          }}
          title="亮色模式"
        >
          ☀️
        </button>
        <button
          className={`titlebar-theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
          onClick={() => {
            updateSettings({ theme: 'dark' });
            window.electronAPI?._internal?.send('theme:changed', 'dark');
          }}
          title="暗色模式"
        >
          🌙
        </button>
        <span className="titlebar-sep" />
        <button onClick={() => window.electronAPI?.window.minimize()} className="titlebar-btn" title="最小化">
          ─
        </button>
        <button onClick={() => window.electronAPI?.window.toggleMaximize()} className="titlebar-btn" title={isMaximized ? '还原' : '最大化'}>
          {isMaximized ? '⧉' : '▢'}
        </button>
        <button onClick={() => window.electronAPI?.window.close()} className="titlebar-btn close" title="关闭">
          ✕
        </button>
      </div>
    </div>
  );
}

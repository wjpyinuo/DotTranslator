import { useState, useEffect } from 'react';

export function TitleBar() {
  const [isMaximized, setIsMaximized] = useState(false);

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
          <svg width="18" height="18" viewBox="0 0 32 32" style={{ verticalAlign: 'middle', marginRight: 6 }}>
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
          DotTranslator
        </span>
      </div>
      <div className="titlebar-controls">
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

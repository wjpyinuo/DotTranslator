import { APP_VERSION } from '@shared/constants';

export function AboutPanel() {

  return (
    <div className="about-panel">
      <div className="about-hero">
        <svg width="48" height="48" viewBox="0 0 32 32">
          <defs>
            <linearGradient id="aboutGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#818cf8"/>
              <stop offset="100%" stopColor="#6366f1"/>
            </linearGradient>
          </defs>
          <rect x="1" y="1" width="30" height="30" rx="7" fill="url(#aboutGrad)"/>
          <text x="9" y="14" fontSize="11" fontWeight="bold" fill="white" fontFamily="Arial,sans-serif">A</text>
          <text x="17" y="25" fontSize="11" fontWeight="bold" fill="rgba(255,255,255,0.85)" fontFamily="Arial,sans-serif">文</text>
          <path d="M14 5 L19 8.5 L14 12" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M12 20 L7 23.5 L12 27" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <h2>DotTranslator</h2>
        <span className="about-version">v{APP_VERSION}</span>
      </div>

      <p className="about-desc">
        即时翻译桌面工具，支持多引擎对比翻译、剪贴板监听、悬浮球、翻译记忆等强大功能。
      </p>

      <div className="about-features">
        <h3>🌟 核心功能</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <span className="feature-icon">🔄</span>
            <div>
              <strong>多引擎翻译</strong>
              <span>DeepL · 有道 · 百度 · 免费翻译，可插拔架构</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">⚡</span>
            <div>
              <strong>并行对比</strong>
              <span>同时调用多个引擎，结果并排显示对比</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📋</span>
            <div>
              <strong>剪贴板监听</strong>
              <span>自动检测剪贴板变化，即时翻译所选文字</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">📸</span>
            <div>
              <strong>截图 OCR</strong>
              <span>Ctrl+Shift+X 截图，自动识别文字并翻译</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🧠</span>
            <div>
              <strong>翻译记忆</strong>
              <span>相同文本直接返回缓存，精准匹配加速翻译</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🪟</span>
            <div>
              <strong>PiP 窗口</strong>
              <span>画中画窗口随时查看翻译结果</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🎨</span>
            <div>
              <strong>亮暗双主题</strong>
              <span>拟态风格亮色 · 毛玻璃暗色，随心切换</span>
            </div>
          </div>
          <div className="feature-item">
            <span className="feature-icon">🔒</span>
            <div>
              <strong>隐私保护</strong>
              <span>无痕模式、敏感内容过滤、API Key 加密存储</span>
            </div>
          </div>
        </div>
      </div>

      <div className="about-footer">
        <button className="about-btn donate-btn about-donate-full" onClick={() => window.open('')}>
          <span className="donate-icon">☕</span> 打赏支持
        </button>
      </div>
    </div>
  );
}

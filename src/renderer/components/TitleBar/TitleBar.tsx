export function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="title">✦ DotTranslator v0.2.0</span>
      </div>
      <div className="titlebar-controls">
        <button onClick={() => window.electronAPI?.window.minimize()} className="titlebar-btn">
          ─
        </button>
        <button onClick={() => window.electronAPI?.window.toggleMaximize()} className="titlebar-btn">
          ▢
        </button>
        <button onClick={() => window.electronAPI?.window.close()} className="titlebar-btn close">
          ✕
        </button>
      </div>
    </div>
  );
}

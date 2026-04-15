import { useAppStore } from '@renderer/stores/appStore';

export function SettingsPanel() {
  const { settings, updateSettings, toggleSettings, showSettings } = useAppStore();

  if (!showSettings) return null;

  return (
    <div className="settings-overlay" onClick={toggleSettings}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ 设置</h2>
          <button onClick={toggleSettings} className="close-btn">✕</button>
        </div>

        <div className="settings-section">
          <h3>主题</h3>
          <div className="theme-toggle">
            <button
              className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
              onClick={() => updateSettings({ theme: 'light' })}
            >
              ☀️ 亮色
            </button>
            <button
              className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
              onClick={() => updateSettings({ theme: 'dark' })}
            >
              🌙 暗色
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3>翻译引擎</h3>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.enabledProviders.includes('deepl')}
              onChange={(e) => {
                const providers = e.target.checked
                  ? [...settings.enabledProviders, 'deepl']
                  : settings.enabledProviders.filter((p) => p !== 'deepl');
                updateSettings({ enabledProviders: providers });
              }}
            />
            DeepL
          </label>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.enabledProviders.includes('google')}
              onChange={(e) => {
                const providers = e.target.checked
                  ? [...settings.enabledProviders, 'google']
                  : settings.enabledProviders.filter((p) => p !== 'google');
                updateSettings({ enabledProviders: providers });
              }}
            />
            Google Translate
          </label>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.enabledProviders.includes('baidu')}
              onChange={(e) => {
                const providers = e.target.checked
                  ? [...settings.enabledProviders, 'baidu']
                  : settings.enabledProviders.filter((p) => p !== 'baidu');
                updateSettings({ enabledProviders: providers });
              }}
            />
            百度翻译
          </label>
        </div>

        <div className="settings-section">
          <h3>隐私</h3>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.clipboardMonitor}
              onChange={(e) => updateSettings({ clipboardMonitor: e.target.checked })}
            />
            剪贴板监听
          </label>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.telemetryEnabled}
              onChange={(e) => updateSettings({ telemetryEnabled: e.target.checked })}
            />
            匿名遥测
          </label>
          <label className="setting-item">
            <input
              type="checkbox"
              checked={settings.privacyMode}
              onChange={(e) => updateSettings({ privacyMode: e.target.checked })}
            />
            🔒 无痕模式
          </label>
        </div>

        <div className="settings-section">
          <h3>快捷键</h3>
          <div className="setting-item">
            <span>呼出窗口</span>
            <kbd>{settings.hotkey}</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

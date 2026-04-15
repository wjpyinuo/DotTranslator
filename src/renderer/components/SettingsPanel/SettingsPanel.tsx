import { useAppStore } from '@renderer/stores/appStore';
import { useState, useEffect, useCallback } from 'react';

// API 申请链接
const API_LINKS = {
  deepl: 'https://www.deepl.com/pro-api?cta=free-product-page',
  youdao: 'https://ai.youdao.com/product-fanyi-text.s',
  baidu: 'https://fanyi-api.com/developer/apply',
};

export function SettingsPanel() {
  const { settings, updateSettings, toggleSettings, showSettings } = useAppStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});

  // 从 safeStorage 加载 API Key
  useEffect(() => {
    if (!showSettings) return;
    const api = window.electronAPI;
    if (!api?.secureStorage) return;
    (async () => {
      const deepl = await api.secureStorage.get('deeplApiKey') || '';
      const youdaoId = await api.secureStorage.get('youdaoAppId') || '';
      const youdaoKey = await api.secureStorage.get('youdaoAppSecret') || '';
      const baiduId = await api.secureStorage.get('baiduAppId') || '';
      const baiduKey = await api.secureStorage.get('baiduSecretKey') || '';
      setApiKeys({ deeplApiKey: deepl, youdaoAppId: youdaoId, youdaoAppSecret: youdaoKey, baiduAppId: baiduId, baiduSecretKey: baiduKey });
    })();
  }, [showSettings]);

  // 保存 API Key 到 safeStorage
  const saveApiKey = useCallback(async (key: string, value: string) => {
    const api = window.electronAPI;
    if (api?.secureStorage) {
      if (value) {
        await api.secureStorage.set(key, value);
      } else {
        await api.secureStorage.delete(key);
      }
    }
    setApiKeys((prev) => ({ ...prev, [key]: value }));
    // 同步到 settings 以便翻译引擎读取
    updateSettings({ [key]: value });
  }, [updateSettings]);

  if (!showSettings) return null;

  const toggleVisibility = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const maskKey = (key: string | undefined): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <div className="settings-overlay" onClick={toggleSettings}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>⚙️ 设置</h2>
          <button onClick={toggleSettings} className="close-btn">✕</button>
        </div>

        {/* 主题 */}
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

        {/* API 密钥设置 */}
        <div className="settings-section">
          <h3>API 接口设置</h3>

          {/* DeepL */}
          <div className="api-key-group">
            <div className="api-key-label">
              <span>DeepL API Key</span>
              <a
                href={API_LINKS.deepl}
                target="_blank"
                rel="noopener noreferrer"
                className="api-link"
              >
                申请 API Key →
              </a>
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys.deepl ? 'text' : 'password'}
                className="api-key-input"
                placeholder="输入 DeepL API Key"
                value={showKeys.deepl ? (apiKeys.deeplApiKey || '') : maskKey(apiKeys.deeplApiKey)}
                onChange={(e) => saveApiKey('deeplApiKey', e.target.value)}
                onFocus={(e) => {
                  if (!showKeys.deepl) {
                    setShowKeys((p) => ({ ...p, deepl: true }));
                    e.target.select();
                  }
                }}
                onBlur={() => setShowKeys((p) => ({ ...p, deepl: false }))}
              />
              <button
                className="toggle-vis-btn"
                onClick={() => toggleVisibility('deepl')}
                type="button"
              >
                {showKeys.deepl ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* 百度翻译 */}
          <div className="api-key-group">
            <div className="api-key-label">
              <span>百度翻译 App ID</span>
              <a
                href={API_LINKS.baidu}
                target="_blank"
                rel="noopener noreferrer"
                className="api-link"
              >
                申请 API →
              </a>
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys.baiduId ? 'text' : 'password'}
                className="api-key-input"
                placeholder="输入百度 App ID"
                value={showKeys.baiduId ? (apiKeys.baiduAppId || '') : maskKey(apiKeys.baiduAppId)}
                onChange={(e) => saveApiKey('baiduAppId', e.target.value)}
                onFocus={(e) => {
                  if (!showKeys.baiduId) {
                    setShowKeys((p) => ({ ...p, baiduId: true }));
                    e.target.select();
                  }
                }}
                onBlur={() => setShowKeys((p) => ({ ...p, baiduId: false }))}
              />
              <button
                className="toggle-vis-btn"
                onClick={() => toggleVisibility('baiduId')}
                type="button"
              >
                {showKeys.baiduId ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="api-key-group">
            <div className="api-key-label">
              <span>百度翻译密钥</span>
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys.baiduKey ? 'text' : 'password'}
                className="api-key-input"
                placeholder="输入百度 Secret Key"
                value={showKeys.baiduKey ? (apiKeys.baiduSecretKey || '') : maskKey(apiKeys.baiduSecretKey)}
                onChange={(e) => saveApiKey('baiduSecretKey', e.target.value)}
                onFocus={(e) => {
                  if (!showKeys.baiduKey) {
                    setShowKeys((p) => ({ ...p, baiduKey: true }));
                    e.target.select();
                  }
                }}
                onBlur={() => setShowKeys((p) => ({ ...p, baiduKey: false }))}
              />
              <button
                className="toggle-vis-btn"
                onClick={() => toggleVisibility('baiduKey')}
                type="button"
              >
                {showKeys.baiduKey ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* 有道翻译 */}
          <div className="api-key-group">
            <div className="api-key-label">
              <span>有道翻译 App ID</span>
              <a
                href={API_LINKS.youdao}
                target="_blank"
                rel="noopener noreferrer"
                className="api-link"
              >
                申请 API →
              </a>
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys.youdaoId ? 'text' : 'password'}
                className="api-key-input"
                placeholder="输入有道 App ID"
                value={showKeys.youdaoId ? (apiKeys.youdaoAppId || '') : maskKey(apiKeys.youdaoAppId)}
                onChange={(e) => saveApiKey('youdaoAppId', e.target.value)}
                onFocus={(e) => {
                  if (!showKeys.youdaoId) {
                    setShowKeys((p) => ({ ...p, youdaoId: true }));
                    e.target.select();
                  }
                }}
                onBlur={() => setShowKeys((p) => ({ ...p, youdaoId: false }))}
              />
              <button
                className="toggle-vis-btn"
                onClick={() => toggleVisibility('youdaoId')}
                type="button"
              >
                {showKeys.youdaoId ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div className="api-key-group">
            <div className="api-key-label">
              <span>有道翻译密钥</span>
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys.youdaoKey ? 'text' : 'password'}
                className="api-key-input"
                placeholder="输入有道 App Secret"
                value={showKeys.youdaoKey ? (apiKeys.youdaoAppSecret || '') : maskKey(apiKeys.youdaoAppSecret)}
                onChange={(e) => saveApiKey('youdaoAppSecret', e.target.value)}
                onFocus={(e) => {
                  if (!showKeys.youdaoKey) {
                    setShowKeys((p) => ({ ...p, youdaoKey: true }));
                    e.target.select();
                  }
                }}
                onBlur={() => setShowKeys((p) => ({ ...p, youdaoKey: false }))}
              />
              <button
                className="toggle-vis-btn"
                onClick={() => toggleVisibility('youdaoKey')}
                type="button"
              >
                {showKeys.youdaoKey ? '🙈' : '👁️'}
              </button>
            </div>
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
              checked={settings.enabledProviders.includes('youdao')}
              onChange={(e) => {
                const providers = e.target.checked
                  ? [...settings.enabledProviders, 'youdao']
                  : settings.enabledProviders.filter((p) => p !== 'youdao');
                updateSettings({ enabledProviders: providers });
              }}
            />
            有道翻译
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

        {/* 隐私 */}
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
              onChange={(e) => {
                updateSettings({ telemetryEnabled: e.target.checked });
                window.electronAPI?.telemetry?.toggle(e.target.checked);
              }}
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

        {/* 快捷键 */}
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

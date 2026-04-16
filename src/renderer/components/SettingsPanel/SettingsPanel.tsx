import { useAppStore } from '@renderer/stores/appStore';
import { useState, useEffect, useCallback } from 'react';

// API 申请链接
const API_LINKS = {
  deepl: 'https://www.deepl.com/pro-api',
  youdao: 'https://ai.youdao.com/product-fanyi-text.s',
  baidu: 'https://fanyi-api.com/',
};

// API Key 格式校验
const KEY_VALIDATORS: Record<string, (v: string) => boolean> = {
  deeplApiKey: (v) => /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}(:[a-z]+)?$/i.test(v) || v.length >= 20,
  youdaoAppId: (v) => /^\d{8,12}$/.test(v),
  youdaoAppSecret: (v) => v.length >= 16,
  baiduAppId: (v) => /^\d{8,15}$/.test(v),
  baiduSecretKey: (v) => v.length >= 16,
};

// 快捷键选项
const HOTKEY_OPTIONS = [
  { key: 'Alt+Space', label: 'Alt + Space' },
  { key: 'Ctrl+Space', label: 'Ctrl + Space' },
  { key: 'Ctrl+Shift+T', label: 'Ctrl + Shift + T' },
  { key: 'Ctrl+Alt+T', label: 'Ctrl + Alt + T' },
];

export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore();
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'error' | 'testing' | null>>({});

  // 从 safeStorage 加载 API Key
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.secureStorage) return;
    void (async () => {
      const deepl = await api.secureStorage.get('deeplApiKey') || '';
      const youdaoId = await api.secureStorage.get('youdaoAppId') || '';
      const youdaoKey = await api.secureStorage.get('youdaoAppSecret') || '';
      const baiduId = await api.secureStorage.get('baiduAppId') || '';
      const baiduKey = await api.secureStorage.get('baiduSecretKey') || '';
      setApiKeys({ deeplApiKey: deepl, youdaoAppId: youdaoId, youdaoAppSecret: youdaoKey, baiduAppId: baiduId, baiduSecretKey: baiduKey });
    })();
  }, []);

  const saveApiKey = useCallback(async (key: string, value: string) => {
    // 格式校验：非空时验证
    if (value && KEY_VALIDATORS[key] && !KEY_VALIDATORS[key](value)) {
      setValidationErrors((prev) => ({ ...prev, [key]: '格式不正确' }));
    } else {
      setValidationErrors((prev) => { const n = { ...prev }; delete n[key]; return n; });
    }

    const api = window.electronAPI;
    if (api?.secureStorage) {
      if (value) {
        await api.secureStorage.set(key, value);
      } else {
        await api.secureStorage.delete(key);
      }
    }
    setApiKeys((prev) => ({ ...prev, [key]: value }));
    updateSettings({ [key]: value });
  }, [updateSettings]);

  // 测试 API 连通性
  const testConnection = useCallback(async (provider: string) => {
    setTestResults((prev) => ({ ...prev, [provider]: 'testing' }));
    try {
      const api = window.electronAPI;
      if (!api?.translation) throw new Error('API not available');

      const results = await api.translation.translate({
        text: 'hello',
        sourceLang: 'en',
        targetLang: 'zh',
        enabledProviders: [provider],
      });

      if (results && Array.isArray(results) && results.length > 0) {
        setTestResults((prev) => ({ ...prev, [provider]: 'success' }));
      } else {
        setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
      }
    } catch {
      setTestResults((prev) => ({ ...prev, [provider]: 'error' }));
    }
    // 3 秒后清除状态
    setTimeout(() => setTestResults((prev) => { const n = { ...prev }; n[provider] = null; return n; }), 3000);
  }, []);

  // 输入失焦时自动清空无效内容
  const handleBlur = useCallback((key: string, value: string) => {
    if (value && KEY_VALIDATORS[key] && !KEY_VALIDATORS[key](value)) {
      // 格式不正确 → 自动清空
      void saveApiKey(key, '');
    }
  }, [saveApiKey]);

  const toggleVisibility = (field: string) => {
    setShowKeys((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const maskKey = (key: string | undefined): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  const renderTestBtn = (provider: string) => {
    const state = testResults[provider];
    return (
      <button
        className={`api-test-btn ${state === 'success' ? 'success' : state === 'error' ? 'error' : ''}`}
        onClick={() => testConnection(provider)}
        disabled={state === 'testing'}
        title="测试连通性"
      >
        {state === 'testing' ? '⏳' : state === 'success' ? '✅' : state === 'error' ? '❌' : '🔍'}
      </button>
    );
  };

  const renderApiKeyGroup = (
    provider: string,
    label: string,
    keyField: string,
    placeholder: string,
    secretField?: string,
    secretLabel?: string,
    secretPlaceholder?: string
  ) => (
    <div className="api-key-card" key={provider}>
      <div className="api-key-card-header">
        <span className="api-provider-name">{label}</span>
        <div className="api-card-actions">
          <a
            href={API_LINKS[provider as keyof typeof API_LINKS]}
            target="_blank"
            rel="noopener noreferrer"
            className="api-link"
          >
            申请 API →
          </a>
          {renderTestBtn(provider)}
        </div>
      </div>
      <div className="api-key-fields">
        <div className="api-key-group">
          <div className="api-key-label">
            <span>{secretField ? 'App ID' : 'API Key'}</span>
            {validationErrors[keyField] && <span className="api-error">{validationErrors[keyField]}</span>}
          </div>
          <div className="api-key-input-wrapper">
            <input
              type={showKeys[keyField] ? 'text' : 'password'}
              className={`api-key-input ${validationErrors[keyField] ? 'input-error' : ''}`}
              placeholder={placeholder}
              value={showKeys[keyField] ? (apiKeys[keyField] || '') : maskKey(apiKeys[keyField])}
              onChange={(e) => saveApiKey(keyField, e.target.value)}
              onFocus={(e) => {
                if (!showKeys[keyField]) {
                  setShowKeys((p) => ({ ...p, [keyField]: true }));
                  e.target.select();
                }
              }}
              onBlur={(e) => handleBlur(keyField, e.target.value)}
            />
            <button className="toggle-vis-btn" onClick={() => toggleVisibility(keyField)} type="button">
              {showKeys[keyField] ? '🙈' : '👁️'}
            </button>
          </div>
        </div>
        {secretField && (
          <div className="api-key-group">
            <div className="api-key-label">
              <span>{secretLabel}</span>
              {validationErrors[secretField] && <span className="api-error">{validationErrors[secretField]}</span>}
            </div>
            <div className="api-key-input-wrapper">
              <input
                type={showKeys[secretField] ? 'text' : 'password'}
                className={`api-key-input ${validationErrors[secretField] ? 'input-error' : ''}`}
                placeholder={secretPlaceholder}
                value={showKeys[secretField] ? (apiKeys[secretField] || '') : maskKey(apiKeys[secretField])}
                onChange={(e) => saveApiKey(secretField, e.target.value)}
                onFocus={(e) => {
                  if (!showKeys[secretField]) {
                    setShowKeys((p) => ({ ...p, [secretField]: true }));
                    e.target.select();
                  }
                }}
                onBlur={(e) => handleBlur(secretField, e.target.value)}
              />
              <button className="toggle-vis-btn" onClick={() => toggleVisibility(secretField)} type="button">
                {showKeys[secretField] ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="settings-inline">
      {/* 主题 */}
      <div className="settings-section">
        <h3>🎨 主题</h3>
        <div className="theme-toggle">
          <button
            className={`theme-btn ${settings.theme === 'light' ? 'active' : ''}`}
            onClick={() => {
              updateSettings({ theme: 'light' });
              window.electronAPI?._internal?.send('theme:changed', 'light');
            }}
          >
            ☀️ 亮色
          </button>
          <button
            className={`theme-btn ${settings.theme === 'dark' ? 'active' : ''}`}
            onClick={() => {
              updateSettings({ theme: 'dark' });
              window.electronAPI?._internal?.send('theme:changed', 'dark');
            }}
          >
            🌙 暗色
          </button>
        </div>
      </div>

      {/* API 接口 */}
      <div className="settings-section">
        <h3>🔑 API 接口设置</h3>
        {renderApiKeyGroup('deepl', 'DeepL', 'deeplApiKey', '输入 DeepL API Key')}
        {renderApiKeyGroup('baidu', '百度翻译', 'baiduAppId', '输入百度 App ID', 'baiduSecretKey', 'Secret Key', '输入百度 Secret Key')}
        {renderApiKeyGroup('youdao', '有道翻译', 'youdaoAppId', '输入有道 App ID', 'youdaoAppSecret', 'App Secret', '输入有道 App Secret')}
      </div>

      {/* 翻译引擎 */}
      <div className="settings-section">
        <h3>🔌 翻译引擎</h3>
        {[
          { id: 'deepl', name: 'DeepL', emoji: '🌐' },
          { id: 'baidu', name: '百度翻译', emoji: '🇨🇳' },
          { id: 'youdao', name: '有道翻译', emoji: '📖' },
          { id: 'fallback', name: '免费翻译（无需 Key）', emoji: '🆓' },
        ].map((eng) => (
          <label className="setting-item" key={eng.id}>
            <input
              type="checkbox"
              checked={settings.enabledProviders.includes(eng.id)}
              onChange={(e) => {
                const providers = e.target.checked
                  ? [...settings.enabledProviders, eng.id]
                  : settings.enabledProviders.filter((p) => p !== eng.id);
                updateSettings({ enabledProviders: providers });
              }}
            />
            <span>{eng.emoji} {eng.name}</span>
          </label>
        ))}
      </div>

      {/* 快捷键 */}
      <div className="settings-section">
        <h3>⌨️ 快捷键</h3>
        <div className="hotkey-selector">
          {HOTKEY_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              className={`hotkey-btn ${settings.hotkey === opt.key ? 'active' : ''}`}
              onClick={() => updateSettings({ hotkey: opt.key })}
            >
              <kbd>{opt.label}</kbd>
            </button>
          ))}
        </div>
        <div className="setting-hint">Ctrl+Shift+X 截图 OCR</div>
      </div>

      {/* 隐私 */}
      <div className="settings-section">
        <h3>🔒 隐私</h3>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.clipboardMonitor}
            onChange={(e) => updateSettings({ clipboardMonitor: e.target.checked })}
          />
          <span>📋 剪贴板监听</span>
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
          <span>📊 匿名遥测</span>
        </label>
        <label className="setting-item">
          <input
            type="checkbox"
            checked={settings.privacyMode}
            onChange={(e) => updateSettings({ privacyMode: e.target.checked })}
          />
          <span>🔒 无痕模式</span>
        </label>
      </div>
    </div>
  );
}

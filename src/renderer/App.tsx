import { useState } from 'react';
import { TitleBar } from './components/TitleBar/TitleBar';
import { InputArea } from './components/InputArea/InputArea';
import { TranslationPanel } from './components/TranslationPanel/TranslationPanel';
import { HistoryList } from './components/HistoryList/HistoryList';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import { StatsPage } from './components/StatsPage/StatsPage';
import { useAppStore } from './stores/appStore';
import './styles/app.css';

type Tab = 'translate' | 'history' | 'stats';

export function App() {
  const { showSettings, toggleSettings, settings } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('translate');

  return (
    <div className={`app-container ${settings.theme}`}>
      <TitleBar />

      <nav className="tab-bar">
        <button
          className={`tab-btn ${activeTab === 'translate' ? 'active' : ''}`}
          onClick={() => setActiveTab('translate')}
        >
          🌐 翻译
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📜 历史
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 统计
        </button>
        <button className="tab-btn settings-tab" onClick={toggleSettings}>
          ⚙️
        </button>
      </nav>

      <main className="main-content">
        {activeTab === 'translate' && (
          <>
            <InputArea />
            <TranslationPanel />
          </>
        )}
        {activeTab === 'history' && <HistoryList />}
        {activeTab === 'stats' && <StatsPage />}
      </main>

      {settings.privacyMode && (
        <div className="privacy-badge">🔒 无痕模式</div>
      )}

      <SettingsPanel />
    </div>
  );
}

import { useAppStore } from '@renderer/stores/appStore';
import type { HistoryEntry } from '@shared/types';

export function HistoryList() {
  const { history } = useAppStore();

  if (history.length === 0) {
    return (
      <div className="history-empty">
        <span>📝 暂无翻译记录</span>
      </div>
    );
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <h3>翻译历史</h3>
      </div>
      <div className="history-items">
        {history.map((entry) => (
          <HistoryItem key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function HistoryItem({ entry }: { entry: HistoryEntry }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(entry.targetText);
  };

  return (
    <div className="history-item">
      <div className="history-langs">
        {entry.sourceLang} → {entry.targetLang}
        <span className="history-provider">{entry.provider}</span>
        {entry.isFavorite && <span className="fav-star">⭐</span>}
      </div>
      <div className="history-source">{entry.sourceText.slice(0, 100)}</div>
      <div className="history-target">{entry.targetText.slice(0, 100)}</div>
      <div className="history-actions">
        <button onClick={handleCopy} className="history-btn">📋</button>
      </div>
    </div>
  );
}

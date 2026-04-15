import { useAppStore } from '@renderer/stores/appStore';
import { useEffect, useState } from 'react';
import type { HistoryEntry } from '@shared/types';

export function HistoryList() {
  const { history } = useAppStore();
  const [dbHistory, setDbHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // 从 SQLite 加载历史记录
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const api = window.electronAPI;
        if (api?.history?.getAll) {
          const rows = await api.history.getAll(200);
          if (!cancelled) setDbHistory(rows as HistoryEntry[]);
        }
      } catch { /* 静默 */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // 合并：当前会话新记录 + 数据库历史（去重）
  const merged: HistoryEntry[] = [...history];
  const sessionIds = new Set(history.map((h) => h.id));
  for (const entry of dbHistory) {
    if (!sessionIds.has(entry.id)) {
      merged.push(entry);
    }
  }

  if (loading) {
    return <div className="history-empty"><span>加载中...</span></div>;
  }

  if (merged.length === 0) {
    return (
      <div className="history-empty">
        <span>📝 暂无翻译记录</span>
      </div>
    );
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <h3>翻译历史 ({merged.length})</h3>
      </div>
      <div className="history-items">
        {merged.map((entry) => (
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

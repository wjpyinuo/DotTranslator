import { useAppStore } from '@renderer/stores/appStore';
import { useEffect, useState, useCallback } from 'react';
import type { HistoryEntry } from '@shared/types';

export function HistoryList() {
  const { history } = useAppStore();
  const [dbHistory, setDbHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  // 搜索
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      // 重新加载全部
      const api = window.electronAPI;
      if (api?.history?.getAll) {
        const rows = await api.history.getAll(200);
        setDbHistory(rows as HistoryEntry[]);
      }
      return;
    }
    const api = window.electronAPI;
    if (api?.history?.search) {
      const rows = await api.history.search(query);
      setDbHistory(rows as HistoryEntry[]);
    }
  }, []);

  // 合并：当前会话新记录 + 数据库历史（去重）
  const merged: HistoryEntry[] = [...history];
  const sessionIds = new Set(history.map((h) => h.id));
  for (const entry of dbHistory) {
    if (!sessionIds.has(entry.id)) {
      merged.push(entry);
    }
  }

  // 如果有搜索词，也在内存中过滤 session 记录
  const filtered = searchQuery.trim()
    ? merged.filter((e) =>
        e.sourceText.includes(searchQuery) || e.targetText.includes(searchQuery)
      )
    : merged;

  if (loading) {
    return <div className="history-empty"><span>加载中...</span></div>;
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <h3>翻译历史 ({filtered.length})</h3>
        <input
          className="server-input"
          placeholder="搜索历史..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          style={{ width: 200, fontSize: 12 }}
        />
      </div>
      {filtered.length === 0 ? (
        <div className="history-empty">
          <span>{searchQuery ? '无匹配结果' : '📝 暂无翻译记录'}</span>
        </div>
      ) : (
        <div className="history-items">
          {filtered.map((entry) => (
            <HistoryItem key={entry.id} entry={entry} />
          ))}
        </div>
      )}
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

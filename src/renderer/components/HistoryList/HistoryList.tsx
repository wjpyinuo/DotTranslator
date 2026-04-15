import { useAppStore } from '@renderer/stores/appStore';
import { useEffect, useState, useCallback } from 'react';
import type { HistoryEntry } from '@shared/types';

export function HistoryList() {
  const { history } = useAppStore();
  const [dbHistory, setDbHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 从 SQLite 加载历史记录
  const loadHistory = useCallback(async () => {
    try {
      const api = window.electronAPI;
      if (api?.history?.getAll) {
        const rows = await api.history.getAll(200);
        setDbHistory(rows as HistoryEntry[]);
      }
    } catch { /* 静默 */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 搜索
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      loadHistory();
      return;
    }
    const api = window.electronAPI;
    if (api?.history?.search) {
      const rows = await api.history.search(query);
      setDbHistory(rows as HistoryEntry[]);
    }
  }, [loadHistory]);

  // 合并：当前会话新记录 + 数据库历史（去重）
  const merged: HistoryEntry[] = [...history];
  const sessionIds = new Set(history.map((h) => h.id));
  for (const entry of dbHistory) {
    if (!sessionIds.has(entry.id)) {
      merged.push(entry);
    }
  }

  const filtered = searchQuery.trim()
    ? merged.filter((e) =>
        e.sourceText.includes(searchQuery) || e.targetText.includes(searchQuery)
      )
    : merged;

  // 切换选择模式
  const toggleSelectMode = () => {
    setSelectMode(!selectMode);
    setSelectedIds(new Set());
  };

  // 全选 / 取消全选
  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((e) => e.id)));
    }
  };

  // 单条删除
  const handleDeleteSingle = useCallback(async (id: string) => {
    const api = window.electronAPI;
    if (api?.history?.delete) {
      await api.history.delete(id);
      setDbHistory((prev) => prev.filter((e) => e.id !== id));
    }
  }, []);

  // 批量删除
  const handleDeleteBatch = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`确定删除选中的 ${selectedIds.size} 条记录？`);
    if (!confirmed) return;
    const api = window.electronAPI;
    if (api?.history?.deleteBatch) {
      await api.history.deleteBatch(Array.from(selectedIds));
      setDbHistory((prev) => prev.filter((e) => !selectedIds.has(e.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }, [selectedIds]);

  // 清空全部
  const handleClearAll = useCallback(async () => {
    const confirmed = window.confirm('确定清空所有翻译历史？此操作不可恢复！');
    if (!confirmed) return;
    const api = window.electronAPI;
    if (api?.history?.clearAll) {
      await api.history.clearAll();
      setDbHistory([]);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }, []);

  // 导出 JSON
  const handleExport = useCallback(async () => {
    const api = window.electronAPI;
    if (!api?.history?.export) return;
    try {
      const jsonStr = await api.history.export();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dottranslator-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    }
  }, []);

  if (loading) {
    return <div className="history-empty"><span>加载中...</span></div>;
  }

  return (
    <div className="history-list">
      <div className="history-header">
        <h3>翻译历史 ({filtered.length})</h3>
        <div className="history-toolbar">
          <div className="history-search-wrapper">
            <span className="history-search-icon">🔍</span>
            <input
              className="history-search-input"
              placeholder="搜索翻译记录..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <button className="history-toolbar-btn" onClick={handleExport} title="导出 JSON">
            📥
          </button>
          <button
            className={`history-toolbar-btn ${selectMode ? 'active' : ''}`}
            onClick={toggleSelectMode}
            title={selectMode ? '取消选择' : '批量选择'}
          >
            {selectMode ? '✕' : '☑'}
          </button>
          {selectMode && (
            <>
              <button className="history-toolbar-btn" onClick={toggleSelectAll} title="全选/取消全选">
                {selectedIds.size === filtered.length ? '☐' : '☑'}
              </button>
              <button
                className="history-toolbar-btn danger"
                onClick={handleDeleteBatch}
                disabled={selectedIds.size === 0}
                title={`删除选中的 ${selectedIds.size} 条`}
              >
                🗑
              </button>
            </>
          )}
          {!selectMode && filtered.length > 0 && (
            <button className="history-toolbar-btn danger" onClick={handleClearAll} title="清空全部">
              🗑
            </button>
          )}
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="history-empty">
          <span>{searchQuery ? '无匹配结果' : '📝 暂无翻译记录'}</span>
        </div>
      ) : (
        <div className="history-items">
          {filtered.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              selectMode={selectMode}
              selected={selectedIds.has(entry.id)}
              onToggleSelect={() => {
                setSelectedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(entry.id)) next.delete(entry.id);
                  else next.add(entry.id);
                  return next;
                });
              }}
              onDelete={() => handleDeleteSingle(entry.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  entry, selectMode, selected, onToggleSelect, onDelete,
}: {
  entry: HistoryEntry;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(entry.targetText);
  };

  return (
    <div className={`history-item ${selected ? 'history-item-selected' : ''}`}>
      <div className="history-langs">
        {selectMode && (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="history-checkbox"
          />
        )}
        {entry.sourceLang} → {entry.targetLang}
        <span className="history-provider">{entry.provider}</span>
        {entry.isFavorite && <span className="fav-star">⭐</span>}
        <span className="history-time">
          {new Date(entry.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="history-source">{entry.sourceText.slice(0, 100)}</div>
      <div className="history-target">{entry.targetText.slice(0, 100)}</div>
      <div className="history-actions">
        <button onClick={handleCopy} className="history-btn" title="复制">📋</button>
        {!selectMode && (
          <button onClick={onDelete} className="history-btn history-btn-delete" title="删除">🗑</button>
        )}
      </div>
    </div>
  );
}

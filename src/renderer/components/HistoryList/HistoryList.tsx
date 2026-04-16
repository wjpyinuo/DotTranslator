import { useAppStore } from '@renderer/stores/appStore';
import { useEffect, useState, useCallback } from 'react';
import type { HistoryEntry } from '@shared/types';

type ExportFormat = 'txt' | 'json' | 'csv';

export function HistoryList() {
  const { history } = useAppStore();
  const [dbHistory, setDbHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }, []);

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

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) { loadHistory(); return; }
    const api = window.electronAPI;
    if (api?.history?.search) {
      const rows = await api.history.search(query);
      setDbHistory(rows as HistoryEntry[]);
    }
  }, [loadHistory]);

  const merged: HistoryEntry[] = [...history];
  const sessionIds = new Set(history.map((h) => h.id));
  for (const entry of dbHistory) {
    if (!sessionIds.has(entry.id)) merged.push(entry);
  }

  let filtered = searchQuery.trim()
    ? merged.filter((e) => e.sourceText.includes(searchQuery) || e.targetText.includes(searchQuery))
    : merged;

  if (showFavoritesOnly) {
    filtered = filtered.filter((e) => e.isFavorite);
  }

  const toggleSelectMode = () => { setSelectMode(!selectMode); setSelectedIds(new Set()); };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filtered.map((e) => e.id)));
  };

  const handleDeleteSingle = useCallback(async (id: string) => {
    const confirmed = window.confirm('确定删除这条翻译记录？');
    if (!confirmed) return;
    const api = window.electronAPI;
    if (api?.history?.delete) {
      await api.history.delete(id);
      setDbHistory((prev) => prev.filter((e) => e.id !== id));
      showToast('✅ 已删除');
    }
  }, [showToast]);

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
      showToast(`✅ 已删除 ${selectedIds.size} 条`);
    }
  }, [selectedIds, showToast]);

  const handleClearAll = useCallback(async () => {
    const confirmed = window.confirm('⚠️ 确定清空所有翻译历史？此操作不可恢复！');
    if (!confirmed) return;
    const api = window.electronAPI;
    if (api?.history?.clearAll) {
      await api.history.clearAll();
      setDbHistory([]);
      setSelectedIds(new Set());
      setSelectMode(false);
      showToast('✅ 历史已清空');
    }
  }, [showToast]);

  // 收藏切换
  const handleToggleFavorite = useCallback(async (entry: HistoryEntry) => {
    const api = window.electronAPI;
    if (entry.isFavorite) {
      if (api?.history?.removeFavorite) await api.history.removeFavorite(entry.id);
    } else {
      if (api?.history?.addFavorite) await api.history.addFavorite(entry.id);
    }
    setDbHistory((prev) => prev.map((e) =>
      e.id === entry.id ? { ...e, isFavorite: !e.isFavorite } : e
    ));
    showToast(entry.isFavorite ? '已取消收藏' : '⭐ 已收藏');
  }, [showToast]);

  // 多格式导出
  const handleExport = useCallback(async (format: ExportFormat) => {
    const api = window.electronAPI;
    if (!api?.history?.export) return;
    try {
      const jsonStr = await api.history.export();
      const data = JSON.parse(jsonStr);

      let content: string;
      let mimeType: string;
      let ext: string;

      if (format === 'json') {
        content = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        ext = 'json';
      } else if (format === 'csv') {
        const header = '时间,源语言,目标语言,引擎,原文,译文\n';
        const rows = data.map((e: HistoryEntry) =>
          `"${new Date(e.createdAt).toLocaleString('zh-CN')}","${e.sourceLang}","${e.targetLang}","${e.provider}","${e.sourceText.replace(/"/g, '""')}","${e.targetText.replace(/"/g, '""')}"`
        ).join('\n');
        content = '\uFEFF' + header + rows;
        mimeType = 'text/csv';
        ext = 'csv';
      } else {
        // txt 默认
        const lines = data.map((e: HistoryEntry) =>
          `[${new Date(e.createdAt).toLocaleString('zh-CN')}] ${e.sourceLang}→${e.targetLang} (${e.provider})\n原文: ${e.sourceText}\n译文: ${e.targetText}\n`
        ).join('\n');
        content = lines;
        mimeType = 'text/plain';
        ext = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dottranslator-history-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast(`✅ 已导出 ${data.length} 条 (${format.toUpperCase()})`);
    } catch (err) {
      console.error('Export failed:', err);
      showToast('❌ 导出失败');
    }
  }, [showToast]);

  if (loading) return <div className="history-empty"><span>加载中...</span></div>;

  return (
    <div className="history-list">
      {toast && <div className="toast">{toast}</div>}
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
          {/* 导出下拉 */}
          <div className="export-dropdown">
            <button className="history-toolbar-btn" title="导出">📥</button>
            <div className="export-menu">
              <button onClick={() => handleExport('txt')}>📄 导出 TXT</button>
              <button onClick={() => handleExport('json')}>📋 导出 JSON</button>
              <button onClick={() => handleExport('csv')}>📊 导出 CSV</button>
            </div>
          </div>
          <button
            className={`history-toolbar-btn ${showFavoritesOnly ? 'active' : ''}`}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            title={showFavoritesOnly ? '显示全部' : '仅看收藏'}
          >
            {showFavoritesOnly ? '⭐' : '☆'}
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
              onToggleFavorite={() => handleToggleFavorite(entry)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function HistoryItem({
  entry, selectMode, selected, onToggleSelect, onDelete, onToggleFavorite,
}: {
  entry: HistoryEntry;
  selectMode: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) {
  const handleCopy = () => {
    navigator.clipboard.writeText(entry.targetText);
  };

  return (
    <div className={`history-item ${selected ? 'history-item-selected' : ''}`}>
      <div className="history-langs">
        {selectMode && (
          <input type="checkbox" checked={selected} onChange={onToggleSelect} className="history-checkbox" />
        )}
        {entry.sourceLang} → {entry.targetLang}
        <span className="history-provider">{entry.provider}</span>
        <button
          className={`fav-star-btn ${entry.isFavorite ? 'favorited' : ''}`}
          onClick={onToggleFavorite}
          title={entry.isFavorite ? '取消收藏' : '收藏'}
        >
          {entry.isFavorite ? '⭐' : '☆'}
        </button>
        <span className="history-time">
          {new Date(entry.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <div className="history-source">{entry.sourceText.slice(0, 100)}</div>
      <div className="history-target">{entry.targetText.slice(0, 100)}</div>
      <div className="history-actions">
        <button onClick={handleCopy} className="history-btn" title="复制译文">📋</button>
        {!selectMode && (
          <button onClick={onDelete} className="history-btn history-btn-delete" title="删除">🗑</button>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from 'react';
import { APP_VERSION } from '@shared/constants';

const ANNOUNCEMENT_URL = 'https://raw.githubusercontent.com/wjpyinuo/DotTranslator/main/announcement.md';
const LOCAL_FILENAME = 'announcement.md';

interface Announcement {
  id: string;
  content: string;
}

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'local' | 'remote' | null>(null);

  const fetchAnnouncement = useCallback(async () => {
    setLoading(true);
    try {
      const api = window.electronAPI;
      let text = '';
      let usedSource: 'local' | 'remote' | null = null;

      // 优先尝试本地文件（测试用）
      if (api?.announcement?.readLocal) {
        try {
          const localText = await api.announcement.readLocal(LOCAL_FILENAME);
          if (localText && localText.trim()) {
            text = localText.trim();
            usedSource = 'local';
          }
        } catch { /* 本地文件读取失败，继续尝试远程 */ }
      }

      // 本地无文件或内容为空 → 回退到远程服务器
      if (!text) {
        if (api?.announcement?.fetch) {
          try {
            const remoteText = await api.announcement.fetch(ANNOUNCEMENT_URL);
            if (remoteText && remoteText.trim()) {
              text = remoteText.trim();
              usedSource = 'remote';
            }
          } catch { /* 远程获取失败 */ }
        } else {
          // 浏览器环境 fallback
          try {
            const res = await fetch(ANNOUNCEMENT_URL);
            if (res.ok) {
              const remoteText = await res.text();
              if (remoteText && remoteText.trim()) {
                text = remoteText.trim();
                usedSource = 'remote';
              }
            }
          } catch { /* 静默 */ }
        }
      }

      setSource(usedSource);

      if (!text) {
        // 无内容时显示默认公告
        text = `欢迎使用 DotTranslator v${APP_VERSION} — 多引擎翻译 · 亮/暗主题 · TM 缓存`;
        usedSource = null;
      }

      // 用内容 hash 作为 id，内容变化时重新显示
      const id = btoa(unescape(encodeURIComponent(text))).slice(0, 16);
      setAnnouncement({ id, content: text });
    } catch {
      // 公告获取失败不阻塞主流程，显示默认公告
      const defaultContent = `欢迎使用 DotTranslator v${APP_VERSION} — 多引擎翻译 · 亮/暗主题 · TM 缓存`;
      setAnnouncement({ id: 'default-v020', content: defaultContent });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAnnouncement();
    // 每 30 分钟刷新公告
    const interval = setInterval(fetchAnnouncement, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncement]);

  if (loading || !announcement) return null;

  return (
    <div className={`announcement-bar ${source === 'local' ? 'announcement-local' : ''}`}>
      <span className="announcement-icon">{source === 'local' ? '📝' : '📢'}</span>
      <span className="announcement-text">{announcement.content}</span>
      {source === 'local' && <span className="announcement-badge">本地测试</span>}
    </div>
  );
}

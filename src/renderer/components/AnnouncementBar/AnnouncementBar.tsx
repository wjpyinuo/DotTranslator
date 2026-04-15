import { useState, useEffect, useCallback } from 'react';

const ANNOUNCEMENT_URL = 'https://raw.githubusercontent.com/nicekid1/DotTranslator/main/announcement.txt';

interface Announcement {
  id: string;
  content: string;
}

export function AnnouncementBar() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAnnouncement = useCallback(async () => {
    setLoading(true);
    try {
      const api = window.electronAPI;
      let text = '';

      if (api?.announcement?.fetch) {
        text = await api.announcement.fetch(ANNOUNCEMENT_URL);
      } else {
        // Fallback: 浏览器环境直接 fetch
        const res = await fetch(ANNOUNCEMENT_URL);
        if (res.ok) text = await res.text();
      }

      if (text && text.trim()) {
        // 用内容 hash 作为 id，内容变化时重新显示
        const id = btoa(unescape(encodeURIComponent(text.trim()))).slice(0, 16);
        const dismissedId = localStorage.getItem('dot_announcement_dismissed');
        if (dismissedId !== id) {
          setAnnouncement({ id, content: text.trim() });
          setDismissed(false);
        } else {
          setDismissed(true);
        }
      }
    } catch {
      // 公告获取失败不阻塞主流程
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncement();
    // 每 30 分钟刷新公告
    const interval = setInterval(fetchAnnouncement, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchAnnouncement]);

  const handleDismiss = () => {
    if (announcement) {
      localStorage.setItem('dot_announcement_dismissed', announcement.id);
    }
    setDismissed(true);
  };

  if (loading || dismissed || !announcement) return null;

  return (
    <div className="announcement-bar">
      <span className="announcement-icon">📢</span>
      <span className="announcement-text">{announcement.content}</span>
      <button className="announcement-close" onClick={handleDismiss} title="关闭公告">
        ✕
      </button>
    </div>
  );
}

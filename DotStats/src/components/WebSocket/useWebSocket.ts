import { useEffect, useRef, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

export function useWebSocket() {
  const { serverUrl, wsConnected, setWsConnected, setRealtimeData } = useStatsStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const serverUrlRef = useRef(serverUrl);

  // 保持 ref 同步，避免 reconnect 闭包捕获旧值
  serverUrlRef.current = serverUrl;

  const connect = useCallback(() => {
    const wsToken = localStorage.getItem('dotstats_ws_token');
    const base = serverUrlRef.current;
    const wsUrl = base.replace(/^http/, 'ws') + '/ws' + (wsToken ? `?token=${encodeURIComponent(wsToken)}` : '');

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setWsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'realtime') {
            setRealtimeData(data.data);
          }
          // 即时事件也触发 realtime 更新（LiveFeedPage 依赖）
          // realtime 数据已包含 recentEvents
        } catch {
          // ignore parse errors
        }
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
        // 无限重连，指数退避 1s → 2s → 4s → ... max 30s
        const delay = Math.min(1000 * Math.pow(2, 0), 30000); // 每次 1s 基础延迟
        reconnectTimer.current = setTimeout(connect, delay);
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };
    } catch {
      // connection failed, retry
      reconnectTimer.current = setTimeout(connect, 5000);
    }
  }, [setWsConnected, setRealtimeData]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { wsConnected };
}

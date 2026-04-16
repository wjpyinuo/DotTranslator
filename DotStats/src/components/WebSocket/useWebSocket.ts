import { useEffect, useRef, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

/** 最大退避延迟（毫秒） */
const MAX_RECONNECT_DELAY_MS = 30000;
/** 基础退避延迟（毫秒） */
const BASE_RECONNECT_DELAY_MS = 1000;

export function useWebSocket() {
  const { serverUrl, wsConnected, setWsConnected, setRealtimeData } = useStatsStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const serverUrlRef = useRef(serverUrl);
  const retryCountRef = useRef(0);

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
        retryCountRef.current = 0; // 连接成功，重置退避计数
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'realtime') {
            setRealtimeData(data.data);
          }
        } catch {
          // ignore parse errors
        }
      };

      wsRef.current.onclose = () => {
        setWsConnected(false);
        // 指数退避: 1s → 2s → 4s → 8s → 16s → 30s (max)
        const delay = Math.min(
          BASE_RECONNECT_DELAY_MS * Math.pow(2, retryCountRef.current),
          MAX_RECONNECT_DELAY_MS
        );
        retryCountRef.current++;
        reconnectTimer.current = setTimeout(connect, delay);
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };
    } catch {
      // connection failed, retry with exponential backoff
      const delay = Math.min(
        BASE_RECONNECT_DELAY_MS * Math.pow(2, retryCountRef.current),
        MAX_RECONNECT_DELAY_MS
      );
      retryCountRef.current++;
      reconnectTimer.current = setTimeout(connect, delay);
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

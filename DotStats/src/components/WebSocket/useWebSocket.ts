import { useEffect, useRef, useCallback } from 'react';
import { useStatsStore } from '../../stores/statsStore';

export function useWebSocket() {
  const { serverUrl, wsConnected, setWsConnected, setRealtimeData } = useStatsStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const retryCount = useRef(0);

  const connect = useCallback(() => {
    const wsUrl = serverUrl.replace(/^http/, 'ws') + '/ws';

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setWsConnected(true);
        retryCount.current = 0;
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
        // 指数退避重连 1s → 2s → 4s → ... max 10次
        if (retryCount.current < 10) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 30000);
          retryCount.current++;
          reconnectTimer.current = setTimeout(connect, delay);
        }
      };

      wsRef.current.onerror = () => {
        wsRef.current?.close();
      };
    } catch {
      // connection failed
    }
  }, [serverUrl, setWsConnected, setRealtimeData]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { wsConnected };
}

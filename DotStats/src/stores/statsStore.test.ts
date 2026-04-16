import { describe, it, expect, beforeEach } from 'vitest';
import { useStatsStore } from './statsStore';

describe('statsStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useStatsStore.setState({
      serverUrl: 'http://localhost:3000',
      wsConnected: false,
      realtimeData: {
        onlineNow: 0,
        todayActive: 0,
        weekActive: 0,
        topFeatures: {},
        versionDistribution: {},
        osDistribution: {},
        recentEvents: [],
      },
      activePage: 'overview',
    });
  });

  it('should have correct initial state', () => {
    const state = useStatsStore.getState();
    expect(state.wsConnected).toBe(false);
    expect(state.activePage).toBe('overview');
    expect(state.realtimeData.onlineNow).toBe(0);
  });

  it('should update wsConnected', () => {
    const { setWsConnected } = useStatsStore.getState();
    setWsConnected(true);
    expect(useStatsStore.getState().wsConnected).toBe(true);
  });

  it('should merge realtimeData partially', () => {
    const { setRealtimeData } = useStatsStore.getState();
    setRealtimeData({ onlineNow: 42, todayActive: 100 });
    const data = useStatsStore.getState().realtimeData;
    expect(data.onlineNow).toBe(42);
    expect(data.todayActive).toBe(100);
    expect(data.weekActive).toBe(0); // not overwritten
  });

  it('should update activePage', () => {
    const { setActivePage } = useStatsStore.getState();
    setActivePage('trends');
    expect(useStatsStore.getState().activePage).toBe('trends');
  });

  it('should merge topFeatures without losing existing keys', () => {
    const { setRealtimeData } = useStatsStore.getState();
    setRealtimeData({ topFeatures: { translate: 50, ocr: 20 } });
    setRealtimeData({ topFeatures: { translate: 60, tts: 10 } });
    const features = useStatsStore.getState().realtimeData.topFeatures;
    expect(features.translate).toBe(60);
    expect(features.tts).toBe(10);
    // ocr was in previous state but replaced by full object merge
    expect(features.ocr).toBeUndefined();
  });

  it('should update recentEvents', () => {
    const { setRealtimeData } = useStatsStore.getState();
    const events = [
      { instanceId: 'abc', type: 'heartbeat', timestamp: Date.now() },
      { instanceId: 'def', type: 'feature', feature: 'translate', timestamp: Date.now() },
    ];
    setRealtimeData({ recentEvents: events });
    expect(useStatsStore.getState().realtimeData.recentEvents).toHaveLength(2);
  });
});

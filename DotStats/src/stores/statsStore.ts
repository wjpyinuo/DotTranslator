import { create } from 'zustand';
import type { RecentEvent } from '../types/api';

interface RealtimeData {
  onlineNow: number;
  todayActive: number;
  weekActive: number;
  topFeatures: Record<string, number>;
  versionDistribution: Record<string, number>;
  osDistribution: Record<string, number>;
  recentEvents: RecentEvent[];
}

interface StatsStore {
  serverUrl: string;
  wsConnected: boolean;
  realtimeData: RealtimeData;
  activePage: string;

  setServerUrl: (url: string) => void;
  setWsConnected: (connected: boolean) => void;
  setRealtimeData: (data: Partial<RealtimeData>) => void;
  setActivePage: (page: string) => void;
}

export const useStatsStore = create<StatsStore>((set) => ({
  serverUrl: localStorage.getItem('dotstats_url') || 'http://localhost:3000',
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

  setServerUrl: (url) => {
    localStorage.setItem('dotstats_url', url);
    set({ serverUrl: url });
  },
  setWsConnected: (connected) => set({ wsConnected: connected }),
  setRealtimeData: (data) =>
    set((state) => ({
      realtimeData: { ...state.realtimeData, ...data },
    })),
  setActivePage: (page) => set({ activePage: page }),
}));

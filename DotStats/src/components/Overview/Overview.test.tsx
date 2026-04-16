import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useStatsStore } from '../../stores/statsStore';

// Mock echarts-for-react to avoid canvas/WebGL in jsdom
vi.mock('echarts-for-react', () => ({
  default: (props: { option?: Record<string, unknown> }) => (
    <div data-testid="echarts-mock" data-option={JSON.stringify(props.option || {})} />
  ),
}));

import { Overview } from './Overview';

describe('Overview', () => {
  beforeEach(() => {
    useStatsStore.setState({
      realtimeData: {
        onlineNow: 15,
        todayActive: 120,
        weekActive: 500,
        topFeatures: { translate: 80, ocr: 30, tts: 10 },
        versionDistribution: { '0.3.1': 100, '0.3.0': 20 },
        osDistribution: { win32: 70, darwin: 40, linux: 10 },
        recentEvents: [
          { instanceId: 'abc', type: 'heartbeat', timestamp: Date.now() },
        ],
      },
    });
  });

  it('should render page title', () => {
    render(<Overview />);
    expect(screen.getByText('📊 总览')).toBeInTheDocument();
  });

  it('should display metric cards with store data', () => {
    render(<Overview />);
    expect(screen.getByText('在线实例')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('should render chart mocks', () => {
    render(<Overview />);
    const charts = screen.getAllByTestId('echarts-mock');
    expect(charts.length).toBeGreaterThanOrEqual(3); // features + version + os + ...
  });

  it('should render zero state correctly', () => {
    useStatsStore.setState({
      realtimeData: {
        onlineNow: 0,
        todayActive: 0,
        weekActive: 0,
        topFeatures: {},
        versionDistribution: {},
        osDistribution: {},
        recentEvents: [],
      },
    });
    render(<Overview />);
    // Should render without crashing with empty data
    expect(screen.getByText('📊 总览')).toBeInTheDocument();
  });
});

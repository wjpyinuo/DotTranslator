import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useStatsStore } from '../../stores/statsStore';

// Mock fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStatsStore.setState({ serverUrl: 'http://localhost:3000' });
  });

  it('should render settings title', () => {
    render(<SettingsPage />);
    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
  });

  it('should display server URL input', () => {
    render(<SettingsPage />);
    const input = screen.getByDisplayValue('http://localhost:3000');
    expect(input).toBeInTheDocument();
  });

  it('should show health check button', () => {
    render(<SettingsPage />);
    expect(screen.getByText('检查健康状态')).toBeInTheDocument();
  });

  it('should perform health check on click', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'healthy',
        checks: { database: 'ok', cache: 'ok' },
        mode: 'production',
      }),
    });

    render(<SettingsPage />);
    fireEvent.click(screen.getByText('检查健康状态'));

    // Wait for async fetch
    await vi.waitFor(() => {
      expect(screen.getByText('healthy')).toBeInTheDocument();
    });
  });

  it('should handle health check failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<SettingsPage />);
    fireEvent.click(screen.getByText('检查健康状态'));

    await vi.waitFor(() => {
      expect(screen.getByText(/unhealthy|连接失败/)).toBeInTheDocument();
    });
  });

  it('should render export section', () => {
    render(<SettingsPage />);
    expect(screen.getByText(/数据导出/)).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node-cron', () => {
  const tasks: { stop: ReturnType<typeof vi.fn> }[] = [];
  return {
    default: {
      schedule: vi.fn((_expr: string, _fn: Function) => {
        const task = { stop: vi.fn() };
        tasks.push(task);
        return task;
      }),
    },
    __tasks: tasks,
  };
});

vi.mock('../../src/db/pool', () => ({
  getPool: vi.fn(() => ({ query: vi.fn().mockResolvedValue({ rows: [] }) })),
}));

vi.mock('../../src/services/redis', () => ({
  cleanExpiredOnline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/tasks/alerts', () => ({
  checkAlerts: vi.fn().mockResolvedValue(undefined),
}));

import { startCronJobs, stopCronJobs } from '../../src/tasks/cron';
import cron from 'node-cron';

describe('cron tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('应该注册 6 个定时任务', () => {
    startCronJobs();
    expect(cron.schedule).toHaveBeenCalledTimes(6);
  });

  it('应该能停止所有任务', () => {
    startCronJobs();
    stopCronJobs();
    // 验证所有 task.stop 被调用
    const mockTasks = (cron as any).__tasks || [];
    for (const task of mockTasks) {
      expect(task.stop).toHaveBeenCalled();
    }
  });
});

import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Playwright E2E 配置 — DotTranslator Electron 测试
 *
 * 运行方式：
 *   npx playwright test
 *   npx playwright test --headed  (有头模式)
 *   npx playwright show-report    (查看报告)
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron 应用路径由测试文件中 launch 指定
      },
    },
  ],
});

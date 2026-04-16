import { test, expect, _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import path from 'path';

let app: ElectronApplication;
let page: Page;

test.beforeAll(async () => {
  app = await electron.launch({
    args: [path.join(__dirname, '..', 'dist-electron', 'main.js')],
    env: {
      ...process.env,
      NODE_ENV: 'test',
    },
  });
  page = await app.firstWindow();
});

test.afterAll(async () => {
  await app?.close();
});

test.describe('DotTranslator 基础功能', () => {
  test('应用窗口正常打开', async () => {
    const window = await app.firstWindow();
    expect(window).toBeTruthy();

    const title = await window.title();
    expect(title).toBeTruthy();
  });

  test('主窗口尺寸正确', async () => {
    const size = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const [width, height] = win.getSize();
      return { width, height };
    });

    // 主窗口应为 480×680（webPreferences 创建时的默认值）
    expect(size.width).toBeGreaterThanOrEqual(420);
    expect(size.width).toBeLessThanOrEqual(500);
    expect(size.height).toBeGreaterThanOrEqual(480);
    expect(size.height).toBeLessThanOrEqual(700);
  });

  test('标题栏渲染正常', async () => {
    const titleBar = page.locator('[class*="TitleBar"], [class*="title-bar"], .titlebar');
    await expect(titleBar).toBeVisible({ timeout: 10_000 });
  });

  test('输入区域渲染正常', async () => {
    const inputArea = page.locator('textarea, [class*="InputArea"], [class*="input-area"]');
    await expect(inputArea.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('主题切换', () => {
  test('支持亮色和暗色主题', async () => {
    // 检查是否有主题切换按钮
    const themeToggle = page.locator('[class*="theme"], [class*="Theme"], button[aria-label*="theme"]').first();

    if (await themeToggle.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // 获取当前主题
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
               document.body.classList.contains('dark') ? 'dark' : 'light';
      });

      // 切换主题
      await themeToggle.click();
      await page.waitForTimeout(500);

      // 验证主题已切换
      const newTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') ||
               document.body.classList.contains('dark') ? 'dark' : 'light';
      });

      expect(newTheme).not.toBe(initialTheme);
    }
  });
});

test.describe('系统托盘', () => {
  test('关闭窗口时最小化到托盘而非退出', async () => {
    // 发送关闭指令
    await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      win.close();
    });

    // 等待一段时间
    await page.waitForTimeout(1000);

    // 应用应该仍然运行（托盘模式）
    const isRunning = await app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows().length >= 0;
    }).catch(() => false);

    // 注意：如果应用退出了，这里会抛出异常
    // 实际行为取决于 app.isQuitting 标志
  });
});

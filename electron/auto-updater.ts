/**
 * 自动更新模块
 * 使用 electron-updater (electron-builder 内置) 从 GitHub Releases 检查更新
 *
 * 行为：
 *  - 应用启动后延迟 5s 检查更新（避免阻塞启动）
 *  - 开发模式下跳过
 *  - 发现更新时通知主窗口，用户可选择立即安装或稍后
 *  - 下载进度通过 IPC 推送
 */
import type { BrowserWindow} from 'electron';
import { ipcMain } from 'electron';

let autoUpdater: any = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let mainWindowRef: BrowserWindow | null = null;
let updateCheckInProgress = false;

/**
 * 初始化自动更新
 * @param getMainWindow 获取主窗口的函数（保持引用最新）
 */
export function initAutoUpdater(getMainWindow: () => BrowserWindow | null): void {
  const isDev = !require('electron').app.isPackaged;
  if (isDev) {
    console.log('[AutoUpdate] Skipped in development mode');
    return;
  }

  try {
    // electron-updater 是 electron-builder 的一部分
     
    const { autoUpdater: updater } = require('electron-updater');
    autoUpdater = updater;
  } catch {
    console.warn('[AutoUpdate] electron-updater not installed, auto-update disabled');
    return;
  }

  // 配置
  autoUpdater.autoDownload = false; // 不自动下载，等用户确认
  autoUpdater.autoInstallOnAppQuit = true;

  // 事件监听
  autoUpdater.on('checking-for-update', () => {
    sendToRenderer(getMainWindow(), 'update:checking');
  });

  autoUpdater.on('update-available', (info: any) => {
    updateCheckInProgress = false;
    sendToRenderer(getMainWindow(), 'update:available', {
      version: info.version,
      releaseDate: info.releaseDate,
      releaseNotes: info.releaseNotes,
    });
  });

  autoUpdater.on('update-not-available', () => {
    updateCheckInProgress = false;
    sendToRenderer(getMainWindow(), 'update:not-available');
  });

  autoUpdater.on('download-progress', (progress: any) => {
    sendToRenderer(getMainWindow(), 'update:progress', {
      percent: Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      total: progress.total,
      transferred: progress.transferred,
    });
  });

  autoUpdater.on('update-downloaded', (info: any) => {
    sendToRenderer(getMainWindow(), 'update:downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err: Error) => {
    updateCheckInProgress = false;
    console.error('[AutoUpdate] Error:', err.message);
    sendToRenderer(getMainWindow(), 'update:error', { message: err.message });
  });

  // IPC: 渲染进程可以触发更新操作
  ipcMain.handle('update:check', async () => {
    if (updateCheckInProgress) return { status: 'checking' };
    updateCheckInProgress = true;
    try {
      const result = await autoUpdater.checkForUpdates();
      return { status: 'ok', updateInfo: result?.updateInfo };
    } catch (err: any) {
      updateCheckInProgress = false;
      return { status: 'error', message: err.message };
    }
  });

  ipcMain.handle('update:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { status: 'downloading' };
    } catch (err: any) {
      return { status: 'error', message: err.message };
    }
  });

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // 延迟检查：启动 5s 后检查更新
  setTimeout(() => {
    if (!updateCheckInProgress) {
      updateCheckInProgress = true;
      autoUpdater.checkForUpdates().catch((err: Error) => {
        updateCheckInProgress = false;
        console.warn('[AutoUpdate] Initial check failed:', err.message);
      });
    }
  }, 5000);

  console.log('[AutoUpdate] Initialized');
}

function sendToRenderer(win: BrowserWindow | null, channel: string, data?: unknown): void {
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, data);
  }
}

export function setMainWindowRef(win: BrowserWindow | null): void {
  mainWindowRef = win;
}

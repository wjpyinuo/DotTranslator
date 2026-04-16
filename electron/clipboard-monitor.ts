/**
 * 剪贴板监听模块 - 自动检测剪贴板变化并过滤敏感内容
 */
import type { BrowserWindow } from 'electron';
import { ipcMain, clipboard } from 'electron';

// ========== 敏感内容过滤 ==========

interface SensitivePattern {
  test: (text: string) => boolean;
}

const SENSITIVE_PATTERNS: SensitivePattern[] = [
  // 信用卡号：13-19 位连续纯数字，用 Luhn 算法校验
  {
    test: (t: string) => {
      const match = t.match(/\b(\d{13,19})\b/);
      if (!match) return false;
      const digits = match[1];
      let sum = 0;
      let alt = false;
      for (let i = digits.length - 1; i >= 0; i--) {
        let n = parseInt(digits[i], 10);
        if (alt) {
          n *= 2;
          if (n > 9) n -= 9;
        }
        sum += n;
        alt = !alt;
      }
      return sum % 10 === 0;
    },
  },
  // 中国手机号：1 开头，第二位 3-9，共 11 位纯数字
  { test: (t: string) => /\b1[3-9]\d{9}\b/.test(t) },
  // 中国身份证号：18 位（末位可为 X）
  { test: (t: string) => /\b\d{17}[\dXx]\b/.test(t) },
  // 中国银行卡号：16-19 位纯数字（前缀为已知银行 BIN）
  { test: (t: string) => /\b(?:62|4\d{2}|5[1-5]|3[47])\d{13,16}\b/.test(t) },
];

function isSensitiveContent(text: string): boolean {
  // 仅对 8 字符以上的文本进行检测，避免短文本误杀
  if (text.trim().length < 8) return false;
  return SENSITIVE_PATTERNS.some((p) => p.test(text));
}

// ========== 剪贴板监听 ==========

let lastClipboardText = '';
let clipboardMonitorEnabled = true;
let monitorInterval: ReturnType<typeof setInterval> | null = null;

export function startClipboardMonitor(getMainWindow: () => BrowserWindow | null): void {
  monitorInterval = setInterval(() => {
    const mainWindow = getMainWindow();
    if (!clipboardMonitorEnabled || !mainWindow) return;
    try {
      const text = clipboard.readText();
      if (!text || text.trim() === '' || text === lastClipboardText) return;
      if (isSensitiveContent(text)) return;
      lastClipboardText = text;
      mainWindow.webContents.send('clipboard:changed', text);
    } catch {
      /* 静默 */
    }
  }, 1000);
}

export function stopClipboardMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
}

export function registerClipboardIPC(): void {
  ipcMain.on('clipboard:monitor-toggle', (_event, enabled: boolean) => {
    clipboardMonitorEnabled = enabled;
  });

  ipcMain.handle('clipboard:readText', () => {
    return clipboard.readText();
  });
}

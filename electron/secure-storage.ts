/**
 * 安全存储模块 - 使用 Electron safeStorage 加密 API Key
 */
import { safeStorage } from 'electron';
import { app, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';

const keyStorePath = path.join(app.getPath('userData'), 'encrypted_keys.dat');

function loadEncryptedKeys(): Record<string, string> {
  try {
    if (!fs.existsSync(keyStorePath)) return {};
    const encrypted = fs.readFileSync(keyStorePath);
    const decrypted = safeStorage.decryptString(encrypted);
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

function saveEncryptedKeys(keys: Record<string, string>): void {
  const encrypted = safeStorage.encryptString(JSON.stringify(keys));
  fs.writeFileSync(keyStorePath, encrypted);
}

export function getDecryptedKeys(): Record<string, string> {
  return loadEncryptedKeys();
}

export function registerSecureStorageIPC(): void {
  ipcMain.handle('secure-storage:get', (_event, key: string) => {
    const keys = loadEncryptedKeys();
    return keys[key] || null;
  });

  ipcMain.handle('secure-storage:set', (_event, key: string, value: string) => {
    const keys = loadEncryptedKeys();
    keys[key] = value;
    saveEncryptedKeys(keys);
  });

  ipcMain.handle('secure-storage:delete', (_event, key: string) => {
    const keys = loadEncryptedKeys();
    delete keys[key];
    saveEncryptedKeys(keys);
  });

  ipcMain.handle('secure-storage:is-available', () => {
    return safeStorage.isEncryptionAvailable();
  });
}

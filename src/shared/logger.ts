/**
 * 统一日志模块
 * - 生产模式下仅输出 warn/error
 * - 开发模式下输出全部
 * - 支持日志前缀便于分类过滤
 */

const isDev = typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function shouldLog(level: LogLevel): boolean {
  if (level === 'error' || level === 'warn') return true;
  return isDev;
}

function prefix(tag: string): string {
  return `[${tag}]`;
}

export function createLogger(tag: string) {
  return {
    debug(...args: unknown[]): void {
      if (shouldLog('debug')) console.debug(prefix(tag), ...args);
    },
    info(...args: unknown[]): void {
      if (shouldLog('info')) console.info(prefix(tag), ...args);
    },
    log(...args: unknown[]): void {
      if (shouldLog('info')) console.log(prefix(tag), ...args);
    },
    warn(...args: unknown[]): void {
      if (shouldLog('warn')) console.warn(prefix(tag), ...args);
    },
    error(...args: unknown[]): void {
      if (shouldLog('error')) console.error(prefix(tag), ...args);
    },
  };
}

/** 顶层默认 logger */
export const logger = createLogger('App');

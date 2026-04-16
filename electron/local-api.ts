/**
 * 本地 HTTP API 模块 - 开发者调试接口
 * 仅监听 127.0.0.1，随机 Token 认证
 */
import http from 'http';
import crypto from 'crypto';
import { ipcMain } from 'electron';
import { translationRouter } from '../src/workers/translation/router';
import { APP_VERSION } from '../src/shared/constants';

const localApiToken = crypto.randomBytes(16).toString('hex');

export function getLocalApiToken(): string {
  return localApiToken;
}

export function startLocalApiServer(): void {
  const server = http.createServer(async (req: any, res: any) => {
    // 仅允许 127.0.0.1
    if (req.socket.remoteAddress !== '127.0.0.1' && req.socket.remoteAddress !== '::1') {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    // Token 认证
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${localApiToken}`) {
      res.writeHead(401);
      res.end('Unauthorized');
      return;
    }

    // 全局 POST/PUT 请求体大小上限 64KB
    if (req.method === 'POST' || req.method === 'PUT') {
      const contentLength = parseInt(req.headers['content-length'] || '0', 10);
      if (contentLength > 64 * 1024) {
        res.writeHead(413);
        res.end(JSON.stringify({ error: 'Payload too large (max 64KB)' }));
        return;
      }
    }

    res.setHeader('Content-Type', 'application/json');

    const url = new URL(req.url, `http://localhost`);
    const pathname = url.pathname;

    try {
      if (pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok', version: APP_VERSION, uptime: process.uptime() }));
      } else if (pathname === '/api/languages' && req.method === 'GET') {
        const { SUPPORTED_LANGUAGES } = await import('../src/shared/constants');
        res.writeHead(200);
        res.end(JSON.stringify(SUPPORTED_LANGUAGES));
      } else if (pathname === '/api/providers' && req.method === 'GET') {
        const providers = translationRouter.getAllProviders().map((p) => ({
          id: p.id,
          name: p.name,
          requiresApiKey: p.requiresApiKey,
        }));
        res.writeHead(200);
        res.end(JSON.stringify(providers));
      } else if (pathname === '/api/translate' && req.method === 'POST') {
        // 请求体大小上限 64KB（翻译文本不应超过此值）
        const MAX_BODY_BYTES = 64 * 1024;
        let body = '';
        let bodyBytes = 0;
        let aborted = false;
        await new Promise<void>((resolve, reject) => {
          req.on('data', (chunk: any) => {
            bodyBytes += chunk.length;
            if (bodyBytes > MAX_BODY_BYTES) {
              aborted = true;
              req.destroy();
              res.writeHead(413);
              res.end(JSON.stringify({ error: 'Payload too large (max 64KB)' }));
              return;
            }
            body += chunk;
          });
          req.on('end', () => {
            if (!aborted) resolve();
          });
          req.on('error', reject);
        });
        if (aborted) return;

        let params: any;
        try {
          params = JSON.parse(body);
        } catch {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
          return;
        }
        const { results, errors } = await translationRouter.translateCompare(
          params,
          params.enabledProviders || ['fallback']
        );
        res.writeHead(200);
        res.end(JSON.stringify({ results, errors }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (err: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // 从 18000 开始尝试绑定
  let port = 18000;
  const tryBind = () => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`[LocalAPI] Listening on http://127.0.0.1:${port}`);
    });
    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE' && port < 18100) {
        port++;
        server.close();
        tryBind();
      }
    });
  };
  tryBind();
}

export function registerLocalApiIPC(): void {
  ipcMain.handle('local-api:token', () => {
    return localApiToken;
  });
}

import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';

// 本地示例不提供认证，仅监听 IPv4 回环地址。
export async function startHttpServer(port = 7331) {
  const app = express();
  app.use((req, res, next) => {
    const host = req.headers.host;
    if (!host || !/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host)) return res.status(403).end();
    if (req.headers.origin) {
      try {
        const origin = new URL(req.headers.origin);
        if (!['http:', 'https:'].includes(origin.protocol) || !['127.0.0.1', 'localhost'].includes(origin.hostname)) return res.status(403).end();
      } catch { return res.status(403).end(); }
    }
    next();
  });
  app.use(express.json({ limit: '64kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'zai-examples' }));
  app.post('/mcp', async (req, res) => {
    const server = createServer();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error(error.message);
      if (!res.headersSent) res.status(500).json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: '服务器内部错误' } });
    }
  });
  app.all('/mcp', (_req, res) => res.status(405).set('Allow', 'POST').end());
  app.use((error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error.status === 400 ? 400 : 500;
    res.status(status).json({ error: status === 500 ? '服务器内部错误' : '请求体无效' });
  });
  return new Promise((resolve, reject) => {
    const listener = app.listen(port, '127.0.0.1', error => error ? reject(error) : resolve(listener));
    listener.on('error', reject);
  });
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) {
  const port = Number(process.env.ZAI_PORT ?? 7331);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('ZAI_PORT 必须为 1 到 65535 之间的整数');
  const listener = await startHttpServer(port);
  console.error(`ZAI MCP: http://127.0.0.1:${listener.address().port}/mcp`);
  const stop = () => listener.close(() => process.exit(0));
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

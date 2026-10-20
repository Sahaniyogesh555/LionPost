import http from 'node:http';
import { getDb } from './lib/db.js';
import { buildApp } from './lib/app.js';
import { startWorker } from './lib/scheduler.js';

const db = getDb();
const app = buildApp(db);

const server = http.createServer((req, res) => {
  app.handle(req, res).catch((err) => {
    console.error('unhandled', err);
    if (!res.headersSent) res.writeHead(500, { 'content-type': 'text/plain' });
    res.end('Server error');
  });
});

const port = Number(process.env.PORT) || 3000;
const host = process.env.HOST || '0.0.0.0';

server.listen(port, host, () => {
  console.log(`LionPost listening on http://${host}:${port}`);
  if (!process.env.LIONPOST_NO_WORKER) {
    startWorker(db, { intervalMs: Number(process.env.LIONPOST_TICK_MS) || 60000 });
    console.log('Scheduler worker started (60s tick).');
  }
});

function shutdown() {
  console.log('Shutting down.');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

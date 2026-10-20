import fs from 'node:fs';
import path from 'node:path';
import { randomToken } from './auth.js';
import { HttpError } from './errors.js';

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    out[k] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function serializeCookie(name, value, opts = {}) {
  const bits = [`${name}=${encodeURIComponent(value)}`];
  if (opts.maxAge != null) bits.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.path) bits.push(`Path=${opts.path}`);
  if (opts.httpOnly) bits.push('HttpOnly');
  if (opts.sameSite) bits.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) bits.push('Secure');
  return bits.join('; ');
}

export function isSecureRequest(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (proto === 'https') return true;
  if (req.socket && req.socket.encrypted) return true;
  const host = String(req.headers.host || '').split(':')[0];
  // Sandbox previews terminate TLS at the proxy and are always https.
  if (host.endsWith('.e2b.app')) return true;
  return false;
}

export function requestIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || req.socket.remoteAddress || 'unknown';
}

async function readRaw(req, limit = 512 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'That request is too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

export async function readBody(req) {
  const type = String(req.headers['content-type'] || '');
  const raw = await readRaw(req);
  if (!raw.length) return { fields: {}, json: null, raw };
  const text = raw.toString('utf8');
  if (type.includes('application/json')) {
    try { return { fields: {}, json: JSON.parse(text), raw }; }
    catch { throw new HttpError(400, 'Invalid JSON body'); }
  }
  if (type.includes('application/x-www-form-urlencoded') || type.includes('multipart/form-data')) {
    const fields = {};
    if (type.includes('multipart/form-data')) return { fields, json: null, raw }; // files stay client-side
    for (const [k, v] of new URLSearchParams(text)) fields[k] = v;
    return { fields, json: null, raw };
  }
  return { fields: {}, json: null, raw, text };
}

export class Router {
  constructor() { this.routes = []; }
  add(method, pattern, handler) {
    const names = [];
    const rx = new RegExp('^' + pattern.replace(/\/:([a-zA-Z_]+)/g, (_, n) => { names.push(n); return '/([^/]+)'; }) + '/?$');
    this.routes.push({ method, rx, names, handler, pattern });
    return this;
  }
  get(p, h) { return this.add('GET', p, h); }
  post(p, h) { return this.add('POST', p, h); }
  put(p, h) { return this.add('PUT', p, h); }
  delete(p, h) { return this.add('DELETE', p, h); }
  match(method, pathname) {
    for (const r of this.routes) {
      if (r.method !== method) continue;
      const m = pathname.match(r.rx);
      if (m) {
        const params = {};
        r.names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
        return { route: r, params };
      }
    }
    return null;
  }
}

export class App {
  constructor({ db, publicDir = 'public', onError } = {}) {
    this.db = db;
    this.router = new Router();
    this.publicDir = path.resolve(publicDir);
    this.onError = onError;
    this.middlewares = [];
  }

  before(fn) { this.middlewares.push(fn); return this; }

  use(router) {
    this.router.routes.push(...router.routes);
    return this;
  }

  async handle(req, res) {
    const started = Date.now();
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const ctx = {
      req, res, url,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams),
      params: {},
      cookies: parseCookies(req.headers.cookie),
      ip: requestIp(req),
      db: this.db,
      user: null,
      csrf: '',
      secure: isSecureRequest(req),
      setCookie: (name, value, opts = {}) => this.setCookie(ctx, name, value, opts),
      clearCookie: (name) => this.setCookie(ctx, name, '', { maxAge: 0 }),
      html: (body, status = 200) => this.html(ctx, body, status),
      text: (body, status = 200) => this.text(ctx, body, status),
      json: (obj, status = 200) => this.json(ctx, obj, status),
      redirect: (to, status = 303) => this.redirect(ctx, to, status),
    };
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    try {
      for (const mw of this.middlewares) await mw(ctx);
      if (req.method === 'GET' || req.method === 'HEAD') {
        if (this.serveStatic(ctx)) return;
      }
      const hit = this.router.match(req.method === 'HEAD' ? 'GET' : req.method, ctx.path);
      if (!hit) {
        if (ctx.path.startsWith('/api/')) return this.json(ctx, { error: 'Not found' }, 404);
        throw new HttpError(404, 'Page not found');
      }
      ctx.params = hit.params;
      ctx.route = hit.route.pattern;
      if (!ctx.cookies.lion_csrf) {
        ctx.csrf = randomToken(16);
        ctx.setCookie('lion_csrf', ctx.csrf, { sameSite: ctx.secure ? 'None' : 'Lax', secure: ctx.secure, maxAge: 30 * 86400, path: '/' });
      } else {
        ctx.csrf = ctx.cookies.lion_csrf;
      }
      const csrfExempt = ctx.path === '/api/echo';
      if (!csrfExempt && (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE')) {
        const body = await readBody(req);
        ctx.body = body;
        ctx.fields = body.fields || {};
        ctx.jsonBody = body.json || null;
        const supplied = ctx.fields._csrf || req.headers['x-csrf'] || (ctx.jsonBody && ctx.jsonBody._csrf);
        if (!supplied || supplied !== ctx.cookies.lion_csrf) {
          throw new HttpError(419, 'This form expired. Reload the page and try again.');
        }
      }
      await hit.route.handler(ctx);
      if (!res.writableEnded && !res.headersSent) this.text(ctx, 'Not found', 404);
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      if (status >= 500) {
        console.error(`[${req.method} ${url.pathname}]`, err);
        if (this.onError) this.onError(err, ctx);
      }
      if (res.headersSent) { res.end(); return; }
      if (ctx.path.startsWith('/api/') || String(req.headers.accept || '').includes('application/json')) {
        this.json(ctx, { error: err.message || 'Server error' }, status);
        return;
      }
      if (status === 401) { this.redirect(ctx, '/login?next=' + encodeURIComponent(ctx.path + url.search)); return; }
      this.html(ctx, errorPage(status, err.message || 'Server error', ctx.user), status);
    } finally {
      if (process.env.LIONPOST_LOG !== '0') {
        const ms = Date.now() - started;
        if (!ctx.path.startsWith('/assets')) console.log(`${req.method} ${url.pathname} ${res.statusCode} ${ms}ms`);
      }
    }
  }

  setCookie(ctx, name, value, opts = {}) {
    const { secure } = ctx;
    const cookie = serializeCookie(name, value, {
      path: '/',
      sameSite: opts.sameSite ?? (secure ? 'None' : 'Lax'),
      secure: opts.secure ?? secure,
      httpOnly: opts.httpOnly ?? false,
      maxAge: opts.maxAge,
    });
    const prev = ctx.res.getHeader('Set-Cookie');
    ctx.res.setHeader('Set-Cookie', prev ? [].concat(prev, cookie) : [cookie]);
  }

  serveStatic(ctx) {
    let rel = decodeURIComponent(ctx.path);
    if (rel === '/') return false;
    if (!rel.startsWith('/assets/') && !rel.startsWith('/uploads/')) return false;
    const file = path.resolve(this.publicDir, '.' + rel.replace('/assets', ''));
    const alias = path.resolve(this.publicDir, '.' + rel);
    const target = fs.existsSync(file) ? file : alias;
    if (!target.startsWith(this.publicDir) || !fs.existsSync(target) || !fs.statSync(target).isFile()) return false;
    const ext = path.extname(target).toLowerCase();
    const body = fs.readFileSync(target);
    ctx.res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': ext === '.css' || ext === '.js' ? 'public, max-age=300' : 'public, max-age=86400',
    });
    ctx.res.end(ctx.req.method === 'HEAD' ? undefined : body);
    return true;
  }

  html(ctx, body, status = 200) {
    const buf = Buffer.from(body);
    ctx.res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8', 'Content-Length': buf.length });
    ctx.res.end(ctx.req.method === 'HEAD' ? undefined : buf);
  }
  text(ctx, body, status = 200) {
    const buf = Buffer.from(String(body));
    ctx.res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': buf.length });
    ctx.res.end(buf);
  }
  json(ctx, obj, status = 200) {
    const buf = Buffer.from(JSON.stringify(obj));
    ctx.res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': buf.length });
    ctx.res.end(buf);
  }
  redirect(ctx, to, status = 303) {
    ctx.res.writeHead(status, { Location: to });
    ctx.res.end();
  }
}

function errorPage(status, message, user) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${status} · LionPost</title>
<link rel="stylesheet" href="/assets/css/app.css"></head>
<body class="error-body"><main class="error-wrap">
<a class="brand" href="/"><span class="brand-mark">LP</span> LionPost</a>
<p class="eyebrow">Error ${status}</p><h1>${escapeHtml(message)}</h1>
<p class="muted">Something went sideways on our side of the wire.</p>
<div class="row"><a class="btn" href="/">Back home</a>${user ? '<a class="btn ghost" href="/app">Open app</a>' : ''}</div>
</main></body></html>`;
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

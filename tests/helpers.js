import { open } from '../lib/db.js';
import { buildApp } from '../lib/app.js';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

export async function withServer(fn, { seed = true } = {}) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lionpost-')), 'test.db');
  const db = open(file);
  if (!seed) {
    for (const table of ['runs', 'automations', 'connections', 'comments', 'likes', 'posts', 'categories', 'sessions', 'users']) {
      db.prepare(`DELETE FROM ${table}`).run();
    }
  }
  const app = buildApp(db);
  const server = http.createServer((req, res) => app.handle(req, res));
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const prevUrl = process.env.LIONPOST_URL;
  process.env.LIONPOST_URL = base;
  const client = makeClient(base);
  try {
    await fn({ base, db, client });
  } finally {
    if (prevUrl === undefined) delete process.env.LIONPOST_URL; else process.env.LIONPOST_URL = prevUrl;
    server.close();
    db.close();
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  }
}

export function makeClient(base) {
  const jar = new Map();
  const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  const store = (res) => {
    const raw = res.headers.getSetCookie?.() || [];
    for (const c of raw) {
      const [pair] = c.split(';');
      const i = pair.indexOf('=');
      const k = pair.slice(0, i).trim();
      const v = pair.slice(i + 1).trim();
      if (!v || /Max-Age=0/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
  };
  const request = async (method, path, { form, json, headers = {}, redirect = 'manual' } = {}) => {
    const init = { method, headers: { ...headers }, redirect };
    if (jar.size) init.headers.cookie = cookieHeader();
    if (form) {
      init.headers['content-type'] = 'application/x-www-form-urlencoded';
      init.body = new URLSearchParams(form).toString();
    }
    if (json) {
      init.headers['content-type'] = 'application/json';
      init.headers['x-csrf'] = decodeURIComponent(jar.get('lion_csrf') || '');
      init.body = JSON.stringify(json);
    }
    const res = await fetch(base + path, init);
    store(res);
    const text = await res.text();
    return { res, text, status: res.status, location: res.headers.get('location') };
  };
  const get = async (path, opts) => {
    const r = await request('GET', path, opts);
    return r;
  };
  return {
    jar,
    request,
    get,
    csrf: () => decodeURIComponent(jar.get('lion_csrf') || ''),
    session: () => jar.get('lion_session'),
    post: async (path, form, opts = {}) => request('POST', path, { form: { _csrf: decodeURIComponent(jar.get('lion_csrf') || ''), ...form }, ...opts }),
    json: async (path, payload, opts = {}) => request('POST', path, { json: payload, ...opts }),
    async login(email = 'demo@lionpost.local', password = 'demo1234') {
      await this.get('/login');
      const r = await this.post('/login', { email, password });
      if (r.status === 303) await this.get('/app');
      return r;
    },
    async register(name, email, password = 'password123') {
      await this.get('/register');
      const r = await this.post('/register', { name, email, password, terms: '1' });
      if (r.status === 303) await this.get('/app');
      return r;
    },
  };
}

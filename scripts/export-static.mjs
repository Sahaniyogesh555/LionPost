#!/usr/bin/env node
/* Static export for GitHub Pages.
 *
 * Boots the real app against a throwaway database, walks the public site, and
 * writes it under docs/ with links rewritten for a Pages project path. The
 * result is a faithful snapshot of the marketing site, blog, community and
 * tool pages — server features (accounts, automations, live tools) need the
 * running app, so forms are neutralised with an explanation instead of
 * posting into a 405.
 *
 *   node scripts/export-static.mjs [--base /LionPost] [--out docs]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { open } from '../lib/db.js';
import { buildApp } from '../lib/app.js';
import { TOOLS } from '../lib/tools.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('--base', '/LionPost').replace(/\/$/, '');
const OUT = path.resolve(arg('--out', 'docs'));

const tmp = path.join(os.tmpdir(), `lionpost-export-${process.pid}.db`);
for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) fs.rmSync(f, { force: true });
const db = open(tmp);
const app = buildApp(db);
const server = http.createServer((req, res) => app.handle(req, res));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const get = async (url) => {
  const res = await fetch(origin + url, { redirect: 'follow' });
  const body = await res.text();
  return { status: res.status, body, type: res.headers.get('content-type') || '' };
};

// --- the public surface -----------------------------------------------------
const paths = new Set(['/', '/tools', '/blog', '/community', '/about', '/terms', '/privacy', '/login', '/register', '/forgot']);
for (const t of TOOLS) paths.add(`/tools/${t.slug}`);
for (const p of db.prepare('SELECT slug FROM blog_posts ORDER BY published_at DESC').all()) paths.add(`/blog/${p.slug}`);
for (const c of db.prepare('SELECT slug FROM categories').all()) paths.add(`/community/category/${c.slug}`);
for (const p of db.prepare('SELECT slug FROM posts ORDER BY pinned DESC, created_at DESC').all()) paths.add(`/community/${p.slug}`);
for (const u of db.prepare('SELECT handle FROM users ORDER BY id').all()) paths.add(`/u/${u.handle}`);
paths.add('/videos');
paths.add('/classic');
paths.add('/classic/blog');
for (const p of db.prepare('SELECT slug FROM blog_posts').all()) paths.add(`/classic/blog/${p.slug}`);
for (const t of db.prepare('SELECT DISTINCT tag FROM blog_posts').all()) paths.add(`/classic/blog/tag/${encodeURIComponent(t.tag)}`);
for (const v of db.prepare('SELECT slug FROM showcase_videos').all()) paths.add(`/videos/${v.slug}`);
for (const t of db.prepare('SELECT DISTINCT tag FROM blog_posts').all()) paths.add(`/blog/tag/${encodeURIComponent(t.tag)}`);
const files = ['/robots.txt', '/llms.txt', '/sitemap.xml', '/feed.xml'];

// --- link rewriting ---------------------------------------------------------
const APP_NOTE = `${BASE}/login/`;
function pageHref(href) {
  if (!href.startsWith('/')) return href;
  if (href.startsWith('/assets/')) return BASE + href;
  if (href.startsWith('/app')) return APP_NOTE;
  if (href === '/community/new') return APP_NOTE;
  const [pathname, query = ''] = href.split('?');
  const clean = pathname.split('#')[0];
  if (files.includes(clean)) return BASE + clean;
  const target = clean === '/' ? `${BASE}/` : `${BASE}${clean.replace(/\/$/, '')}/`;
  return target + (query ? `?${query}` : '');
}

function rewrite(html) {
  return html
    // absolute asset and page URLs
    .replace(/(href|src|action)="(\/(?!\/)[^"]*)"/g, (m, attr, value) => `${attr}="${pageHref(value)}"`)
    // any localhost URL the renderer baked in (canonical, og:url, JSON-LD)
    .replaceAll(origin, `https://sahaniyogesh555.github.io${BASE}`)
    // forms cannot post to a static host
    .replace(/<form\b([^>]*)>/g, (m, attrs) => `<form${attrs.replace(/\s(action|method)="[^"]*"/g, '')} data-static-form>`)
    // the banner stylesheet + script, and the note itself
    .replace('</head>', `<link rel="stylesheet" href="${BASE}/assets/css/static-preview.css"></head>`)
    .replace('</body>', `${banner()}</body>`);
}

function banner() {
  return `<div class="static-note" role="status">
  <strong>Static preview.</strong> The marketing site, blog, community and tool pages are here.
  Accounts, posting and the working tools run in the app — <a href="https://github.com/Sahaniyogesh555/LionPost#deploying">deploy it in one click</a>.
  <button type="button" class="static-note-x" data-static-dismiss aria-label="Dismiss">×</button>
</div>
<script src="${BASE}/assets/js/static-preview.js" defer></script>`;
}

function outPath(urlPath) {
  const clean = urlPath.split('?')[0].replace(/^\/+|\/+$/g, '');
  if (!clean) return path.join(OUT, 'index.html');
  if (/\.(txt|xml)$/.test(clean)) return path.join(OUT, clean);
  return path.join(OUT, clean, 'index.html');
}

// --- run --------------------------------------------------------------------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
let written = 0;
for (const url of [...paths, ...files]) {
  const res = await get(url);
  if (res.status !== 200) { console.warn(`skip ${url} (${res.status})`); continue; }
  const dest = outPath(url);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const body = /text\/html/.test(res.type) ? rewrite(res.body) : res.body.replaceAll(origin, `https://sahaniyogesh555.github.io${BASE}`);
  fs.writeFileSync(dest, body);
  written++;
}

// assets, copied under the same /assets prefix the app uses
for (const dir of ['css', 'js']) {
  fs.mkdirSync(path.join(OUT, 'assets', dir), { recursive: true });
  for (const f of fs.readdirSync(path.join('public', dir))) {
    fs.copyFileSync(path.join('public', dir, f), path.join(OUT, 'assets', dir, f));
  }
}
fs.copyFileSync('public/favicon.svg', path.join(OUT, 'favicon.svg'));
fs.copyFileSync('public/favicon.svg', path.join(OUT, 'assets', 'favicon.svg'));
fs.copyFileSync('public/manifest.webmanifest', path.join(OUT, 'assets', 'manifest.webmanifest'));
fs.copyFileSync('public/apple-touch-icon.png', path.join(OUT, 'assets', 'apple-touch-icon.png'));
fs.mkdirSync(path.join(OUT, 'assets', 'icons'), { recursive: true });
for (const icon of fs.readdirSync('public/icons')) {
  fs.copyFileSync(path.join('public/icons', icon), path.join(OUT, 'assets', 'icons', icon));
}

// a 404 that still looks like the product
const notFound = await get('/nothing-here');
fs.writeFileSync(path.join(OUT, '404.html'), rewrite(notFound.body));

fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, 'assets/js/static-preview.js'), fs.readFileSync('scripts/static-preview.js', 'utf8'));
fs.writeFileSync(path.join(OUT, 'assets/css/static-preview.css'), fs.readFileSync('scripts/static-preview.css', 'utf8'));

// drop the build-only database
server.close();
db.close();
for (const f of [tmp, `${tmp}-wal`, `${tmp}-shm`]) fs.rmSync(f, { force: true });

console.log(`exported ${written} pages to ${path.relative(process.cwd(), OUT)} with base ${BASE}`);

# LionPost

One account for social automation, writing tools and a creator community — a
working, self-hosted rebuild of a public product surface, written from
scratch.

No dependencies. No build step. Node 22.5+ and a disk.

```bash
npm start          # http://localhost:3000
npm test           # 60 node:test cases
```

The first run creates `data/lionpost.db` and seeds a demo account:

| Email | Password | Role |
| --- | --- | --- |
| `demo@lionpost.local` | `demo1234` | admin, owns the sample workspace |
| `aria@lionpost.local` | `lionpost123` | community member |
| `diego@lionpost.local` | `lionpost123` | community member |
| `priya@lionpost.local` | `lionpost123` | community member |
| `tomas@lionpost.local` | `lionpost123` | community member |
| `lina@lionpost.local` | `lionpost123` | community member |

Delete `data/lionpost.db*` to re-seed.

## What is in it

**Marketing site** — landing page with live counters, sixteen tool pages, a
blog with topic filters and share controls, a video shelf whose clips render in
the browser, about, terms, privacy, `robots.txt`, `sitemap.xml`, `feed.xml`,
`llms.txt`, and an installable-app manifest with icons.

**Two themes.** The current design is the default. A second, complete front
end at `/classic` reproduces the layout family of the original site's 2016
GitHub Pages build: fixed navbar, full-bleed hero with a CSS-drawn phone
mockup, trust strip, four circular feature marks, a split "under the hood"
section, a call-to-action band, counters and a heavy footer, plus a
year-grouped blog archive with a category sidebar. Set
`LIONPOST_THEME=classic` to serve it at `/`, `/blog` and `/blog/<slug>` too.

**Accounts** — registration, sign-in, sign-out, password reset with hashed
single-use tokens, scrypt password hashing, 30-day sessions, CSRF on every
state-changing request, per-IP throttles on the credential endpoints.

**Workspace** — dashboard with a 14-day activity series, composer that writes
captions, threads, articles, carousels, pins and video scripts, drafts,
keyword research, AEO checker, video maker, carousel and pin designer, shorts
cutter.

**Automations** — connections with an encrypted token vault, RSS/Atom feeds
with a sitemap fallback, schedules with a background worker, dry runs, live
delivery to webhooks and Telegram, a run log with the exact payload and
response, and an audit trail.

**Community** — categories, threads with Markdown, comments, likes, pins,
locks, tags, search, profiles, notifications, and moderator controls.

**Client-side media** — carousels render to PNG on a canvas; videos and shorts
are recorded with `MediaRecorder` and downloaded as WebM. Nothing is uploaded.

## What is simulated, and why

The product is complete; the third-party services behind it are not reachable
from this sandbox, so three seams are local:

| Seam | Behaviour here | To make it real |
| --- | --- | --- |
| Content generation | Deterministic local engine in `lib/generator.js`; same input, same output | Swap the function bodies for a model call |
| Social platforms | Dry run logs the payload; webhooks and Telegram deliver for real when you connect them | Add OAuth app credentials per platform in `lib/scheduler.js` `deliver()` |
| Email | `lib/mailer.js` prints reset links to the server log and keeps them in an in-memory outbox | Replace `send()` with Resend/SES/Postmark |

Instagram, Facebook, X, Pinterest, TikTok, YouTube and Dailymotion adapters
return the exact reason they cannot post live rather than pretending. Webhook
delivery is real: point a connection at any URL you control.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `HOST` | `0.0.0.0` | bind address |
| `LIONPOST_DB` | `data/lionpost.db` | SQLite file |
| `LIONPOST_SECRET` | generated | session/CSRF pepper |
| `LIONPOST_KEY_FILE` | `data/.vault-key` | AES-256-GCM key for stored tokens |
| `LIONPOST_URL` | request host | absolute base for feed and webhook URLs |
| `LIONPOST_NO_WORKER` | unset | run without the scheduler worker |
| `LIONPOST_TICK_MS` | `60000` | worker interval |
| `LIONPOST_LOG` | `1` | request and mail logging |
| `LIONPOST_THEME` | unset | set to `classic` to serve the 2016-shaped layout at the canonical paths |

## Deploying

**Vercel.** Live at **https://lionpost.vercel.app** (project `lionpost`,
framework preset Node, root directory `/`, no env vars).

The repository is ready: `api/index.js` is the single function, `vercel.json`
rewrites every route to it, and `public/` is bundled with `includeFiles` so the
asset handler can read CSS and JS. Import the repo, keep the root directory,
and deploy — no build step, no environment variables required.

Automatic deploys are off for this project, so a push does not ship on its own.
Trigger a build from the Vercel dashboard (Deployments → Redeploy), or enable
the Git link under Settings → Git.

Two serverless caveats apply to that preview:

- SQLite lives in `/tmp`, so the database is reseeded on every cold start.
  Accounts, threads and runs made in the preview are temporary.
- The scheduler worker does not run on serverless. Manual runs work; scheduled
  runs need a durable database and a cron (or run `node server.js` on a host
  with a disk).

For durable data, point `LIONPOST_DB` at a persistent volume, or swap
`lib/db.js` for Postgres. Everything else — routes, views, engines — is
storage-agnostic and already runs unchanged.

**GitHub Pages** serves static files only, so it cannot run the app. A static
snapshot of the public site is published from `docs/` (generated, 57 pages,
zero broken internal links):

```bash
npm run export:static        # rebuild docs/ from a seeded database
```

The snapshot covers the landing page, all sixteen tool pages, the blog, the
community and profiles. Forms are neutralised with an explanation, and
accounts/automations/live tools point at the deploy instructions — anything
that needs a server needs a server.

**Durable previews.** Run `node server.js` on any host with a disk and
`LIONPOST_DB` set, then point a domain at it. That is the only configuration
where sessions, the scheduler and writes all behave as designed.

## Layout

```
server.js            HTTP server, scheduler worker, graceful shutdown
lib/app.js           buildApp(db): middleware + route table
lib/db.js            schema, migrations-in-place, demo seed
lib/http.js          Router, cookies, body parsing, CSRF, responses
lib/{auth,crypto}    scrypt passwords, session tokens, AES-256-GCM vault
lib/{generator,keywords,aeo,markdown,rss}   the content and analysis engines
lib/scheduler.js     adapters, delivery, run log, feed polling, worker
lib/tools.js         the sixteen-tool catalogue
routes/*.js          site, community, app, api, meta
views/*.js           server-rendered HTML; no client framework
public/              CSS design system, eight vanilla client scripts
tests/               node:test suites against a real server and a temp DB
replica/             recon, feature matrix, parity and contrast reports
```

## Testing

```bash
npm test                                                  # all suites
node --test tests/automation.test.js                      # one suite
python3 .claude/skills/replica-diff/parity.py replica/features.csv
python3 .claude/skills/replica-brand/sweep.py . --config replica/brand.json
python3 .claude/skills/replica-design/contrast.py replica/design/tokens.json
```

`tests/links.test.js` crawls every page a signed-in member can reach and fails
on a broken link; `tests/wiring.test.js` checks that every id and data
attribute the client scripts query exists in the markup the server sends.

## Provenance

This is a clean-room rebuild. The feature inventory, page map and flows were
recorded from the public site in `replica/recon.md`; the code, copy, palette,
logo and seeded content are original. No third-party asset, stylesheet or
source file is included, and this project is not affiliated with the product it
was modelled on.

`replica/provenance.md` records what was kept and what was not, and names the
source product — the only place in the repository that does, so that the
rebrand sweep can stay strict everywhere else. `replica/parity.md` is the
feature-by-feature comparison; `replica/brand.json` is the sweep config.

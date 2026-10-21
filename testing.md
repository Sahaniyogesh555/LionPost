# testing.md

Test record for LionPost. Every number below was produced by running the
command shown, in this repository, on 2026-10-20.

Environment: Linux sandbox, Node v22.22.3, Python 3.11.2, no browser, no
outbound internet beyond the package registries.

## Summary

| Suite | Cases | Pass | Fail | What it proves |
| --- | --- | --- | --- | --- |
| `auth.test.js` | 6 | 6 | 0 | register, login, logout, guarded routes, duplicate email, weak password |
| `community.test.js` | 8 | 8 | 0 | threads, comments, likes, slug uniqueness, permissions, locks, search, escaping, profiles |
| `tools.test.js` | 9 | 9 | 0 | 16 tool pages, keyword engine, AEO engine, demos, CSV export, video/carousel outputs |
| `automation.test.js` | 9 | 9 | 0 | connections, vault, webhook delivery, dry vs live, failures, feeds, dedupe, worker tick |
| `security.test.js` | 8 | 8 | 0 | scrypt hashes, vault tamper, hashed session tokens, cookie flags, HTML escaping, password change, account deletion, headers |
| `pages.test.js` | 8 | 8 | 0 | landing, all 16 tools, blog + JSON-LD, robots/sitemap/feed/llms, 404, every app screen, studio save, health |
| `reset.test.js` | 6 | 6 | 0 | forgot form, no user enumeration, one-hour single-use token, weak/mismatched password, session revocation, new password works |
| `wiring.test.js` | 5 | 5 | 0 | every script exists, every queried id and data attribute is in the markup, JSON payloads parse, demos call real endpoints |
| `links.test.js` | 2 | 2 | 0 | 99 pages crawled from 18 seeds, 0 broken links; public site walkable signed out |
| `classic.test.js` | 7 | 7 | 0 | classic page sections, year-grouped archive, topic filter, article, self-hosted assets, theme switch (home, blog, tags, legal) |
| `library.test.js` | 5 | 5 | 0 | video shelf, watch page and view counter, blog topics, share controls, manifest/icons/sitemap |
| `newuser.test.js` | 3 | 3 | 0 | a cold account walks every screen, runs the full loop, sees no `undefined` |
| **Total** | **76** | **76** | **0** | |

```bash
npm test
# tests 76, pass 76, fail 0
```

Suites run against a real HTTP server on `127.0.0.1:0` with a fresh seeded
SQLite file per test, so ordering never matters and nothing touches `data/`.

## Replica pipeline tools

| Tool | Command | Result |
| --- | --- | --- |
| Parity | `parity.py replica/features.csv` | **100.0 / 100**, 49 counted features, 29 of 29 must-haves, 0 missing |
| Contrast | `contrast.py replica/design/tokens.json` | **20 pairs, 0 failing AA** (fixed `--dim`: `#6d7688` → `#848da0`) |
| Rebrand sweep | `sweep.py . --config replica/brand.json` | **Clean** — no original name, domain or brand colour in the tree |

Reports: `replica/parity.md`, `replica/design/tokens.json`,
`replica/brand.json`, `replica/features.csv`, `replica/recon.md`.

## Manual verification

Run against a live server with the seeded database.

| Check | Result |
| --- | --- |
| `GET /` `/tools` `/community` `/blog` `/about` `/terms` `/privacy` `/login` `/register` `/forgot` | 200 |
| `GET /robots.txt` `/sitemap.xml` `/feed.xml` `/llms.txt` `/api/health` | 200 |
| `POST /forgot` for a known address | link logged, token stored hashed, 60-minute expiry |
| Reset with reused token | 410 |
| Keyword research, `content automation` | 22 phrases, deterministic, CSV export 200 |
| `/videos` and a watch page | 200, canvas payload parses, view counter increments, unknown slug 404 |
| AEO on `/blog/how-to-run-a-content-queue-without-becoming-a-content-machine` | **89/100**, 14 passed, 1 failed (HTTPS only), 18 checks |
| Webhook connection test | "Webhook responded 200" |
| Live automation run | delivered, `simulated:false`, response stored in the run log |
| Run against a dead endpoint | `failed`, error captured, failure counter incremented |
| Feed add from own `/feed.xml` | items discovered, deduped by GUID |
| Studio generate (`carousel`) | 8 slides, image brief, copy/download work |
| Unknown path | branded 404 |

## Not covered

**The browser.** There is no Chromium or Firefox in this sandbox, so canvas
rendering, `MediaRecorder` capture and clipboard writes are verified only by
`wiring.test.js` (the element and payload the scripts need are present) and by
reading the code. Those are the paths to click first on a machine with a
browser.

**Third-party publishing.** Instagram, Facebook, X, Pinterest, TikTok,
YouTube and Dailymotion need app credentials that do not exist here. Their
adapters return the exact blocker. Webhooks and Telegram are exercised for
real; Telegram needs a bot token to do the same.

**Email delivery.** `lib/mailer.js` is a local transport. Reset links are
printed to the server log and kept in memory; there is no SMTP hop to test.


## Deployment

| Target | Result |
| --- | --- |
| Vercel project `lionpost` | READY, production alias **https://lionpost.vercel.app** |
| Node runtime on Vercel | 22.x, `node:sqlite` available; database and vault key live in `/tmp` |
| Live spot checks | `/` renders seeded counters, `/login` renders, `/api/health` returns 200, `/assets/css/app.css` served from `includeFiles` |
| GitHub Pages | static export committed to `docs/`; Pages cannot be enabled with the available token (403), workflow is dispatch-only |

Serverless caveats: the SQLite file is per-instance and reseeded on every cold
start, so accounts and posts made in the preview do not persist, and the
scheduler worker is not started. Manual runs, tools and the whole read surface
work.

## Skill pack

The Replica skill pack itself (11 skills, 6 Python tools) was installed from
`Jakeschincariol/replica-skill` @ `77c9436` (MIT). Its upstream suite ran
57/57 green from a throwaway clone; it is not vendored, so it is not part of
the 64 above. Tool exit codes are meaningful: `sweep`/`listing` return 1 on
findings, `parity` returns 0 even at 0/100, bad input returns 2.

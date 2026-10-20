# memory.md

Working memory for the LionPost repo. Newest state first. Keep this short:
what is done, what was decided and why, what is broken, what is next.

Last updated: 2026-10-20
Branch: `arena/e59b6511-lionpost`
State: clean tree, three commits, tip pushed to origin.

---

## 1. Progress

### Done: LionPost is a working product

The source product (named in `replica/provenance.md` only) rebuilt clean-room:
its marketing site, sixteen tools and the app behind them, rebranded as
LionPost on a gold-and-ink palette. No dependencies, no build step, `node:sqlite` for storage.

| Area | State |
| --- | --- |
| Marketing | landing with live counters, 16 tool pages, blog + structured data, about, terms, privacy, robots/sitemap/feed/llms |
| Accounts | register, login, logout, password reset, sessions, CSRF, throttles |
| Workspace | dashboard, composer (6 formats), drafts, keywords, AEO, video, carousel, pin, shorts, settings, notifications |
| Automations | connections + AES-256-GCM vault, feeds, schedules, worker, dry/live runs, run log, audit |
| Community | categories, threads, comments, likes, pins, locks, tags, search, profiles, moderator tools |
| Client media | canvas carousel → PNG, `MediaRecorder` video/shorts → WebM, SRT shift + translate |

Measured on the seeded content: **AEO 89/100** on the first blog post (the
only failed check is HTTPS, which cannot pass on a local server), **parity
100/100** over 45 counted features, **contrast 20/20 token pairs at AA**,
**rebrand sweep clean**.

### Done: Replica skill pack installed (earlier commit)

Source `https://github.com/Jakeschincariol/replica-skill`, v1.0.0, commit
`77c9436`, MIT © Jake Schincariol. Vendored into `.claude/skills/` (11 skills,
6 stdlib Python tools) plus a local README with provenance. Upstream tests
ran green (57/57) from a throwaway clone; they are not vendored (D4 below).

### Done: public preview

- Vercel project `lionpost` (prj_zHOqaNAFtsB4d5PRgQI4adu2HSMm), production
  alias **https://lionpost.vercel.app**, framework preset `node`, Node 22.x,
  built from `arena/e59b6511-lionpost`.
- `api/index.js` runs the whole app as one function; `vercel.json` rewrites
  every path to it and bundles `public/**`.
- Auto-deploy from Git is disabled on the project; redeploy from the dashboard
  or set `framework` + link the repo.
- `docs/` holds a 57-page static export for GitHub Pages; the Pages site cannot
  be enabled with this token, so the workflow is manual.

### Not done

- No browser in the sandbox, so the canvas/`MediaRecorder` paths are verified
  by wiring tests, not by clicking. `tests/wiring.test.js` proves every id,
  data attribute and script the client code asks for exists in the markup.
- Live posting to Instagram/Facebook/X/Pinterest/TikTok/YouTube/Dailymotion
  needs app credentials; the adapters refuse with that reason instead of
  faking a success.
- No CI pipeline yet.

---

## 2. Decisions

**D1. One process, zero dependencies.** `node:sqlite` is enough for the data
model, and the HTML is rendered on the server. That keeps the checkout
runnable with `node server.js` and makes the tests fast. A framework would add
a toolchain without adding a feature.

**D2. Clean-room, with provenance.** `replica/recon.md` records what the
original does, page by page. Code, copy, palette, logo and seed content are
original. `replica/brand.json` + `sweep.py` enforce it; parity is tracked
feature by feature in `replica/features.csv`.

**D3. Simulate the unreachable seams, never the outcomes.** Content generation
is a deterministic local engine, mail prints to the log, and each social
adapter explains what is missing. Webhooks and Telegram are real — they leave
the process.

**D4. Do not vendor the skill pack's own tests.** They validate the pack, not
LionPost; results are in `testing.md`. Add them back only if the Python tools
become part of CI.

**D5. Free means free.** No pricing page, no upgrade path, no card. The
original's promise is part of the product, so the replica keeps it.

**D6. Starter content instead of blank canvases.** A cold visit to the
carousel or video screen builds an unsaved starter so the canvas, download and
playback controls work on first paint. Saved-deck lists stay honest.

---

## 3. Bugs, issues and gotchas

**B1. A view helper that drops its `body` renders a blank page with status
200.** Happened twice: `shell()` dropping `opts.body`, and `appPage()` missing
a `canonical` parameter. Both produced 200s with empty `<main>`. Lesson: smoke
tests must assert on page text, not on status or byte size.

**B2. CSRF cookie is cleared at login.** Read `lion_csrf` *after* the redirect
lands (`GET /app`), never from the login response. Tests do this in
`makeClient.login()`.

**B3. Webhooks arrive without a CSRF token.** `/api/echo` is the only exempt
POST; anything else that posts machine-to-machine needs the same treatment.

**B4. Relative webhook paths need a base.** `deliver()` resolves `/api/echo`
against `LIONPOST_URL` (tests set it) or `127.0.0.1:$PORT`.

**B5. A second connection for the same platform is a 409 by design.** Tests
delete or replace the seeded webhook first.

**B6. Script and asset paths are `/assets/js/*`, not `/js/*`.** A missing
`tools-app.js` shipped a 404 script tag on two app pages; the wiring test now
catches it.

**B7. Seeded `/u/demo` was a dead link.** Handles are derived from names
(`demo@` → `alex`). Footer now links the signed-in handle.

**B8. Skill-pack sharp edges.** `sweep.py` only looks for colours you pass;
`parity.py` exits 0 even at 0/100; `listing.py`/`sweep.py` exit 1 on findings,
2 on bad input. Run with `PYTHONDONTWRITEBYTECODE=1`.

---

## 4. Next steps

1. **Browser pass.** With a real browser, click: carousel PNG export, video
   record + download, shorts capture, studio AJAX, keyword copy, mobile nav.
   Everything is wired; nothing has been clicked.
2. **Real model behind the composer.** `lib/generator.js` is deliberately one
   function per format. Replace bodies, keep signatures.
3. **OAuth adapters.** `deliver()` in `lib/scheduler.js` is the only seam per
   platform; webhook and Telegram show the shape.
4. **Optional: contrast/parity in CI.** Both tools are deterministic and
   fast; a push gate would catch palette and feature drift.
5. **Refresh policy every few months.** Character limits and platform rules
   encoded in `lib/tools.js` age.

# Provenance

This folder is the only place in the repository where the source product is
named. `sweep.py` skips `replica/` by design: planning notes need to name the
original, shipping code must not.

## What was rebuilt

- Source product: **AlphaPost**, `https://alphapost.io/` and its app host.
- Public surface recorded on 2026-10-20: landing page, tool index, six tool
  detail pages, community feed, blog index, registration screen.
- Recorded into `recon.md` (page map, states, copy themes), `features.csv`
  (47 rows: 45 counted features, 2 additions) and `parity.md` (score).

## What "clean-room" means here

| Kept | Not kept |
| --- | --- |
| The feature set and the order a user meets it | Their HTML, CSS, JavaScript or server code |
| URL shapes where they carry meaning (`/tools/<slug>`, `/community/<slug>`) | Their assets, logo, favicon, illustrations, fonts |
| The product promise (free, one account, sixteen tools) | Their marketing copy, thread titles, member names, avatars |
| Screen responsibilities (dashboard, studio, connections) | Their visual identity: palette, type scale, components |

Every page, component, string and colour in `views/` and `public/css/` was
written for LionPost. Seeded threads, blog posts, members and numbers are
invented.

## Why the names still appear here

A parity report is worthless if it cannot name what it is comparing against,
and a brand sweep is worthless if it cannot be told what to look for. The
boundary is the folder: `replica/` is research, everything else ships.

## Enforcement

```bash
python3 .claude/skills/replica-brand/sweep.py . --config replica/brand.json
# Clean. Nothing of the original's name, domain or colours found.
```

`replica/brand.json` lists the name variants and domains. Brand colours are
deliberately empty: LionPost's gold was chosen independently and is not the
original's accent, so sweeping for it would produce false positives.

## Affiliation

LionPost is an independent build. It is not affiliated with, endorsed by, or
connected to the source product. Before any public deployment, re-run the
sweep and complete `replica-brand`'s rename checklist.

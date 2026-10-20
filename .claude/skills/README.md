# Replica skills

Eleven Claude skills from [Jakeschincariol/replica-skill](https://github.com/Jakeschincariol/replica-skill),
installed project-locally so they travel with this repo.

- Source commit: `77c9436` (v1.0.0, 2026-10-03)
- License: MIT, see [LICENSE](LICENSE)
- Requirements: Python 3.8+ for the bundled tools. Nothing to pip install.

## Pipeline

Run them in order. Each skill reads what the previous one wrote, in a
`replica/` folder at the repo root.

```
recon -> architect -> design -> build -> backend -> test -> diff -> entrepreneur -> brand -> launch -> deploy
```

| Skill | What it does |
| --- | --- |
| `replica-recon` | Reverse-engineers an app: screens, flows, components, data model, feature matrix. |
| `replica-architect` | Plans the stack, database schema and API. |
| `replica-design` | Rebuilds the design system as tokens, with original assets. |
| `replica-build` | Rebuilds the app screen by screen from the recon map. |
| `replica-backend` | Auth, database, payments, email, integrations. |
| `replica-test` | Test plan, Playwright specs, bug reports by severity. |
| `replica-diff` | Feature parity score plus a colour-blind screenshot layout diff. |
| `replica-entrepreneur` | Reads real user reviews, ranks complaints, builds a fix plan and angle. |
| `replica-brand` | Names and rebrands the clone, sweeps the code for leftovers. |
| `replica-launch` | Landing page, pricing, App Store and Play Store listing lint. |
| `replica-deploy` | Preflight gate, production setup, DNS, ship. |

Each skill can also be run on its own.

## Tools

```
python3 replica-diff/imgdiff.py original.png clone.png --out diff.png
python3 replica-diff/parity.py replica/features.csv
python3 replica-entrepreneur/reviews.py replica/reviews.csv
python3 replica-design/contrast.py replica/design/tokens.json
python3 replica-brand/sweep.py . --avoid "Original App"
python3 replica-launch/listing.py replica/launch/listing.json
```

All standard-library Python, no network access.

## Fine print

The pack rebuilds functionality and UX patterns clean-room. It does not copy
the target's source, assets, logos, trademarks, copy or private APIs, and it
rebrands before launch.

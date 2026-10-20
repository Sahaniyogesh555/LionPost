# memory.md

Working memory for the LionPost repo. Newest state first. Keep this short:
what is done, what was decided and why, what is broken, what is next.

Last updated: 2026-10-20
Branch: `arena/e59b6511-lionpost`
Repo state: clean, two commits, `7a3a052` pushed to origin.

---

## 1. Progress

### Done: Replica skill pack installed

| Item | Detail |
| --- | --- |
| Source | `https://github.com/Jakeschincariol/replica-skill` |
| Version | v1.0.0, commit `77c9436`, dated 2026-10-03 |
| Licence | MIT, (c) 2026 Jake Schincariol, `LICENSE` copied alongside |
| Skills | 11 folders, 29 tracked files, ~200 KB |
| Project copy | `LionPost/.claude/skills/` (committed, travels with the repo) |
| Global copy | `~/.claude/skills/` (outside git, same 11 folders + LICENSE) |
| Commit | `7a3a052` "Install Replica skill pack (11 skills) into .claude/skills" |
| Push | `origin/arena/e59b6511-lionpost`, branch created by this push |

Skills: `replica-recon`, `replica-architect`, `replica-design`, `replica-build`,
`replica-backend`, `replica-test`, `replica-diff`, `replica-entrepreneur`,
`replica-brand`, `replica-launch`, `replica-deploy`.

Bundled tools (standard library Python, no network): `parity.py`,
`imgdiff.py`, `reviews.py`, `contrast.py`, `sweep.py`, `listing.py`.

### Done: repo housekeeping

- Added `.claude/skills/README.md`: provenance, pinned commit, pipeline order,
  tool commands, fine print.
- Added root `.gitignore`: `__pycache__/`, `*.py[cod]`, `.venv/`, `.DS_Store`.
- Verified installed tree is byte-identical to upstream (11/11 folders).
- Verified upstream test suite: 57 tests, all pass.
- Exercised all six tools by hand; results in `testing.md`.

### Not started

- No `replica/` working folder yet. Nothing has been reverse-engineered.
- LionPost itself is still just a README (`# LionPost`). No app, no stack.

---

## 2. Decisions

**D1. Vendor into `.claude/skills/` instead of using the plugin marketplace.**
The README's plugin route (`/plugin marketplace add ...`) needs Claude Code
with plugin support. This environment has no `claude` CLI, and the repo needs
to be reproducible for anyone who clones it. Copying the folders is the
route upstream documents for exactly this case.

**D2. Install both project-local and global.**
Project-local is the source of truth and is versioned. The global copy makes
the skills usable from any directory in this sandbox. Consequence: two copies
to keep in sync. Refresh both when upstream moves.

**D3. Pin to `77c9436`, do not track `main`.**
Upstream has a single commit and no tags. Vendoring the exact tree means a
clone of this repo behaves the same next month. Upgrading is a deliberate
re-copy plus a re-run of the test suite, not a silent drift.

**D4. Do not vendor upstream's `tests/` directory.**
The tests validate the skill pack, not LionPost. Keeping 57 tests and the
fixtures in the repo would imply they gate our app. They were run against a
throwaway clone in `/tmp`; the results are recorded in `testing.md`. If we
later want CI coverage of the tools, add the suite back under
`.claude/skills/tests/` and wire it up properly.

**D5. Commit the `.gitignore` with the install.**
The first pass picked up `__pycache__/*.pyc` from the smoke tests. Bytecode is
build output, not source. Ignoring it, then amending the commit to drop the
six tracked `.pyc` files, keeps the tree to 29 real files.

**D6. Add our own `README.md` inside `.claude/skills/`.**
Upstream's README is written for the whole skill pack as a standalone product.
A local readme that states source, commit, licence and the pipeline order is
what someone browsing this repo actually needs.

**D7. Treat the skills as instructions, not as installed software.**
Each `SKILL.md` is prose that a model follows. There is no executable entry
point beyond the six Python scripts. Invoking a skill here means reading the
matching `SKILL.md` and following it, not calling a slash command.

---

## 3. Bugs, issues and gotchas

### B1. Bytecode leaked into the first commit (fixed)
`python3` writes `__pycache__` next to the scripts during smoke tests, and
`git add .claude` picked it up: 6 `.pyc` files in the initial commit.
Fixed by adding `.gitignore`, `git rm --cached` on the compiled files and
amending. Current state: 0 tracked `.pyc`, 0 `__pycache__` directories.
Worth remembering: run tools with `PYTHONDONTWRITEBYTECODE=1` when testing
inside the repo.

### B2. No `claude` CLI in this environment (limitation, not fixable here)
`command -v claude` returns nothing. The documented `/replica-recon` style
commands therefore do not exist in this sandbox. Workaround is D7: name the
skill, load `SKILL.md`, follow it.

### B3. `sweep.py` is silent about colours unless you pass them
Running `sweep.py <dir> --avoid "Original App"` reports "Clean" even when the
target's brand hex is sitting in the source. Colour scanning only engages with
`--colors "#ff5a5f"` or a `--config` JSON that lists `colors`. First observed
on a fixture containing `#FF5A5F`; re-ran with `--colors` and it correctly
reported `1 hits (color 1)` and exited 1. Not an upstream defect, but a sharp
edge: "Clean" means "clean of the things you told it to look for".

### B4. `listing.py` flags the shipped example's own copy
The example listing at `replica-launch/listing.example.json` produces
`0 errors, 1 warnings`: `'free' reads as a ranking or price claim` in the
Google Play short description. The tool is right and the example text is the
thing to fix. Keep the warning in mind when writing LionPost's listing.

### B5. Bad fixture, not a bad tool (resolved, no action)
The first `imgdiff` run failed with
`imgdiff: [Errno 2] No such file or directory: '/tmp/moved.png'`. Cause was my
own fixture generator raising before it wrote the file. Rebuilt the fixture
and the tool behaved correctly. Recorded so nobody re-investigates it.

### B6. `reviews.py` refuses an empty input rather than printing an empty table
Exit code 2, message on stderr:
`reviews: no usable rows. Every row needs a url (http...) and the review text.`
Correct behaviour, but scripts calling it need to handle a non-zero exit on
empty data.

### B7. Tool exit codes are meaningful and must be respected
`sweep.py` and `listing.py` return 1 on findings, `parity.py` returns 0 even
at 0/100, `imgdiff --fail-under` returns 1 below threshold, bad input returns
2 with a message. The deploy preflight depends on these, so any wrapper must
propagate them instead of swallowing them.

---

## 4. Next steps

1. **Pick the target app and run recon.** `/replica-recon` equivalent: point
   the skill at the app's URL plus our own account screenshots. Output lands
   in `replica/recon.md`, `replica/features.csv`.
2. **Create `replica/` and commit its `.gitkeep`.** Give the pipeline a home
   before the first run so nothing gets written to a stray path.
3. **Decide scope before building.** `replica-recon` sizes the job honestly;
   record the in-scope and out-of-scope lists in `memory.md` when it lands.
4. **Consider a light CI job.** 57 upstream tests plus `sweep.py` on our own
   source would catch a rebrand regression on every push. Requires vendoring
   `tests/` (see D4).
5. **Refresh policy every few months.** Store character limits and copycat
   rules encoded in `listing.py` can go stale; re-check before a real launch.
6. **Keep `~/.claude/skills` in sync** with the project copy, or drop the
   global copy if it starts drifting.

# testing.md

Test record for the Replica skill pack installation in LionPost.
Every result below was produced by running the command shown, in this
repository, on 2026-10-20.

Environment: Linux sandbox, Python 3.11.2, git, no `claude` CLI.
Skill source: `Jakeschincariol/replica-skill` @ `77c9436` (v1.0.0, MIT).
Installed at: `.claude/skills/` (project) and `~/.claude/skills/` (global).

## Summary

| Suite | Cases | Pass | Fail | Notes |
| --- | --- | --- | --- | --- |
| Upstream unit tests | 57 | 57 | 0 | `python3 -m unittest discover -s tests` |
| Install integrity | 6 | 6 | 0 | folders, frontmatter, byte-identity, licence |
| Tool behaviour | 17 | 17 | 0 | 6 tools, happy path plus failure paths |
| Repo hygiene | 3 | 3 | 0 | no bytecode, no em dashes, clean tree |
| **Total** | **83** | **83** | **0** | 1 warning raised by `listing.py` on example copy |

One caveat up front: these cover the shipped tools and packaging. They do not
and cannot cover the quality of the skills' advice, because a `SKILL.md` is
instruction text, not code. See Known limitations, L1.

---

## 1. Upstream unit tests

Run against a clean clone of `77c9436` in `/tmp`, not against the vendored
copy, so the test fixtures do not pollute the repo.

| ID | Test case | Command | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T01 | Full upstream suite | `python3 -m unittest discover -s tests` | all pass | `Ran 57 tests in 0.607s` / `OK` | Pass |

Coverage of that suite: skill folder layout, frontmatter shape, plugin
manifest, README copy, em-dash ban, `imgdiff`, `parity`, `reviews`, `sweep`,
`contrast`, `listing`.

---

## 2. Install integrity

| ID | Test case | Command | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T02 | All 11 skills present in project | `ls .claude/skills` | 11 `replica-*` dirs | 11 dirs + `README.md` + `LICENSE` | Pass |
| T03 | Global copy present | `ls ~/.claude/skills` | same 11 | 11 dirs + `LICENSE` | Pass |
| T04 | Frontmatter name matches folder | `head -3 SKILL.md` grep `name:` per folder | 11/11 | 11/11 OK | Pass |
| T05 | Installed tree is unmodified upstream | `diff -r --exclude=__pycache__` per folder | no drift | 11/11 identical | Pass |
| T06 | Licence carried over | `cat .claude/skills/LICENSE` | MIT text | MIT, (c) 2026 Jake Schincariol | Pass |
| T07 | File count as expected | `git ls-files .claude/skills \| wc -l` | 29 | 29 | Pass |

---

## 3. Tool behaviour

All commands run from `.claude/skills/` with `PYTHONDONTWRITEBYTECODE=1`.

### 3.1 `parity.py`

| ID | Test case | Input | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T08 | Untouched template scores zero | `parity.py replica-recon/features.csv` | 0/100, must-haves listed missing | `Parity: 0.0 / 100`, `must-haves 0 of 9 done`, `Not shippable yet: 9 must-have features are not done`, per-area breakdown | Pass |
| T09 | Must-haves done, shoulds partial | crafted CSV, all `must=yes`, `should=partial` | high score, shippable, must-haves complete | `Parity: 80.0 / 100`, `must-haves 9 of 9 done`, no shippability block | Pass |
| T10 | Empty/absent file | no argument file | non-zero exit, message | exit 2, argparse/IO error | Pass |

Note on T09: partial credit is half, so 6 partial `should` features moved the
score to 80 without any `could` items done. The score is only as good as the
`priority` column in the CSV.

### 3.2 `imgdiff.py`

Fixtures were generated as 160x160 PNGs: `orig.png` (three black boxes),
`same.png` (identical), `moved.png` (one box shifted and recoloured red).

| ID | Test case | Command | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T11 | Identical images, layout mode | `imgdiff.py orig.png same.png` | 100, no regions | `LAYOUT ###...### 100.0 MATCHES`, `no differing regions`, exit 0 | Pass |
| T12 | Colour change only is not penalised | `--mode pixel` on identical pair | 100 | `PIXEL 100.0 MATCHES`, exit 0 | Pass |
| T13 | Moved box, layout mode | `imgdiff.py orig.png moved.png --out diff.png` | partial score, region list | `LAYOUT 56.4 PARTLY`, 3 regions (`x=13 y=78 w=117 h=26` etc.), writes diff image, exit 0 | Pass |
| T14 | Moved box, pixel mode | `--mode pixel` | lower score, bigger region | `PIXEL 84.4 CLOSE`, 1 region `x=13 y=78 w=143 h=52` | Pass |
| T15 | Threshold gate | `--fail-under 90` on moved pair | non-zero when below | exit 1 | Pass |
| T16 | Machine-readable output | `--json` | valid JSON with dimensions and regions | valid JSON (`mode`, `original`, `clone`, `compared_at`) | Pass |
| T17 | Missing input | nonexistent path | exit 2, message | `imgdiff: [Errno 2] No such file or directory: ...`, exit 2 | Pass |

T17 was first triggered by a broken fixture of mine, not by the tool (see
`memory.md` B5). Re-verified with a genuinely missing file.

### 3.3 `contrast.py`

| ID | Test case | Input | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T18 | Shipped template palette | `contrast.py replica-design/tokens.json` | 0 failures, exit 0 | `9 pairs, 0 failing AA`, exit 0 | Pass |
| T19 | Deliberately failing palette | `text-muted` set to `#c8cdd4`, `accent` to `#ffe9a8` | failures reported, exit 1 | `4 failing AA`: 1.60, 1.49, 1.20, 1.20, exit 1 | Pass |

The 9 checked pairs come from the `pairs` list in `tokens.json`, so only pairs
someone thought to declare get checked.

### 3.4 `sweep.py`

| ID | Test case | Input | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T20 | Clean directory | `sweep.py replica-build --avoid "Original App"` | clean, exit 0 | `Clean. Nothing of the original's name, domain or colours found.`, exit 0 | Pass |
| T21 | Name hit inside an identifier | fixture containing `OriginalAppEmbed` | hit with file:line | `name Original App x.js:1`, `1 hits (name 1)`, exit 1 | Pass |
| T22 | Domain and colour hit | `--domains originalapp.com --colors "#ff5a5f"` on `#FF5A5F` fixture | hit | `color #ff5a5f t.js:1`, `1 hits (color 1)`, exit 1 | Pass |
| T23 | No criteria supplied | `sweep.py replica-build` | refuses, exit 2 | `sweep: nothing to look for. Pass --avoid with the original app's name.`, exit 2 | Pass |

T20 passing while T22's colour sat in a fixture is the important detail: the
clean result only covers what was asked for. Colours need `--colors` or a
`--config` JSON.

### 3.5 `listing.py`

| ID | Test case | Input | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T24 | Shipped example listing | `listing.py replica-launch/listing.example.json` | no errors | `0 errors, 1 warnings`, exit 0 | Pass (with warning) |
| T25 | Over-limit and copycat metadata | name 58 chars, subtitle 53 chars, avoid `Slotwise`, ranking words | multiple errors, exit 1 | `6 errors, 3 warnings`, exit 1 | Pass |

T24's warning, verbatim:
`WARN google_play.short_description: 'free' reads as a ranking or price claim.`
The tool is correct; the example copy is what needs changing.

T25 errors, verbatim:
- `app_store.name: 58 characters, limit is 30 (28 over)`
- `app_store.name: mentions 'Slotwise'.`
- `app_store.subtitle: 53 characters, limit is 30 (23 over)`
- `app_store.description`, `google_play.title`, `google_play.full_description`: trademark mention
- plus ranking-claim and wasted-keyword warnings

### 3.6 `reviews.py`

| ID | Test case | Input | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T26 | Row with no URL is dropped | 3 rows, 1 with empty `url` | 2 counted, 1 dropped, thin flag | `2 reviews from 1 sources (G2)`, `1 rows dropped: no link or no text.`, theme marked `(thin)` | Pass |
| T27 | Empty CSV | header only | refuse, exit 2 | `reviews: no usable rows. Every row needs a url (http...) and the review text.`, exit 2 | Pass |

---

## 4. Repo hygiene

| ID | Test case | Command | Expected | Actual | Result |
| --- | --- | --- | --- | --- | --- |
| T28 | No tracked bytecode | `git ls-files \| grep pyc` | none | 0 | Pass |
| T29 | No em dashes in vendored files | scan for U+2014 | none | 0 files | Pass |
| T30 | Working tree clean after install | `git status --short` | empty | empty | Pass |

---

## 5. Known limitations

**L1. Skills are instructions, not tested software.** Only the six Python
scripts have automated tests. Whether `replica-recon` produces a good screen
inventory depends on the model and the source material. Do not read T01-T30 as
a quality score for the skills.

**L2. No slash commands in this environment.** There is no `claude` CLI, so
`/replica-recon` and friends do not exist here. A skill runs when the matching
`SKILL.md` is read and followed. Anyone using this repo from Claude Code will
get the commands; this sandbox will not.

**L3. `imgdiff` accepts PNG only.** 8- and 16-bit PNG, grey/RGB/palette, with
or without alpha. Interlaced PNGs are refused with a re-save message. No JPEG,
WebP or HEIC support; convert before comparing. Screenshots of different
dimensions are rescaled to a common width, which can mask small differences.

**L4. Layout mode is colour-blind by design, and that has a cost.** Edge maps
ignore hue so a rebrand does not lose points, but a change that only moves
colour between two elements of identical geometry will not be seen as a
difference. Use `--mode pixel` when the question is "is this the same
screenshot", not "is this the same layout".

**L5. `parity.py` inherits every judgement in `features.csv`.** The weight of
`must`/`should`/`could`, which side of the in-scope line a feature sits on,
and whether `partial` is honest are all human inputs. 100/100 means "matches
our matrix", not "matches the app".

**L6. `reviews.py` does not fetch anything.** It reads a CSV you supply and
drops rows without a link. Collecting the reviews is a research step done by
the model, subject to whatever sources are reachable. Every quote is traceable
to a row, but the sample is only as broad as what was collected. Under 30
reviews is explicitly flagged as thin.

**L7. `sweep.py` only finds what it is told to look for.** The name, domains
and hex colours must be passed explicitly with `--avoid`, `--domains`,
`--colors` or `--config`. It does not extract a palette from screenshots, does
not know synonyms, and does not catch near-miss hex values or recoloured
logos. A clean sweep is a necessary check, not a sufficient one.

**L8. Store limits encoded in `listing.py` can go stale.** App Store name 30
and subtitle 30, Google Play title 30 and short description 80 were correct
when the pack shipped on 2026-10-03. Store policy changes; re-check before a
real submission. The tool also heuristically flags words like `free` and
`best` as claims, which produces warnings on legitimate copy.

**L9. Python 3.8+ is claimed upstream but only 3.11.2 was exercised here.**
No 3.8 interpreter was available in this sandbox, so the floor is untested.
All scripts are standard library only, so risk is low but not zero.

**L10. The global copy at `~/.claude/skills/` is not versioned.** It sits
outside git and outside this repo's review process, so it can drift from
`.claude/skills/`. Re-copy or delete it. Only the project copy is reproducible.

**L11. Upstream's test suite is not vendored** (decision D4 in `memory.md`).
Nothing in this repo currently fails if the skills are edited badly. Add the
suite under `.claude/skills/tests/` if that changes.

**L12. Legal and ethical bounds are enforced by instruction, not by code.**
The pack is clean-room by policy and `replica-deploy` is told to block on a
dirty sweep, but nothing in these scripts stops someone from copying assets.
The trademark, domain and store checks `replica-brand` lists are manual work
for a human, and the pack's own fine print says to get legal advice before
selling. This is not legal advice.

---

## Reproducing

```
cd .claude/skills
export PYTHONDONTWRITEBYTECODE=1
python3 replica-diff/parity.py replica-recon/features.csv
python3 replica-design/contrast.py replica-design/tokens.json
python3 replica-launch/listing.py replica-launch/listing.example.json
python3 replica-brand/sweep.py replica-build --avoid "Original App"

# upstream suite, from a throwaway clone
git clone --depth 1 https://github.com/Jakeschincariol/replica-skill.git /tmp/rs
cd /tmp/rs && python3 -m unittest discover -s tests -v
```

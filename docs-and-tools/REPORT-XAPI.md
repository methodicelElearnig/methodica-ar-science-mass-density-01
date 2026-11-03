# xAPI reporting — methodica-science-mass-density-01

Added 2026-11-02 following `2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`
(§5–§7), after the optimization pass (`OPTIMIZATION-REPORT.md`, guide §15).

## Lineage

| file | from | changes |
|---|---|---|
| `unit-js/10-identity.js` | mass-gas-01 (2026-11-02) | this unit's prefix / unit id; header notes |
| `unit-js/20-xapi.js` | mass-gas-01 | none (header note, the example slug) |
| `unit-js/25-report.js`, `unit-css/25-report.css` | mass-gas-01 (byte for byte from liquid-02) | none |
| `unit-js/40-resume.js` | mass-gas-01 | `UI_CHARACTER_KEY`, `UNIT_CHARACTERS = []`, `RESULT_KEYS = []`, `NAV_EDGE_KEY`, header |
| `unit-js/50-loader.js` | mass-gas-01 | header note only |
| `unit-js/90-boot.js` | mass-gas-01 | none |
| `_test/xapi-720-k.js` | mass-gas-01 | `__reset` keys |
| `_test/verify-report.js` | **body-matter-01** (same flat layout) | this unit's checks (see its header) |
| per-part seams, call sites, hooks (`script.js` tail) | **body-matter-01** pattern | written for this unit |

The gas unit drives its parts from a data engine through `70-engine-bridge.js`; this unit, like
body-matter-01, keeps per-screen code in each part's `script.js`, so the seams and the four resume
hooks live at the bottom of every `script.js` and the bridge is not copied.

## Page contract (every part)

`index.html`: `../unit-css/25-report.css`, the `#boot-cover` net right after `<body>`, the
"מצאתם בעיה?" flag button and the three report dialogs as the last children of `#app`, then the
script tags `10-identity → 20-xapi → 25-report → 40-resume → 50-loader → 05-media → 05-motion →
(applet/*.js in parts 01/02) → script.js → 90-boot`, one `?v=20261102c` on every code reference.

`script.js`: `goTo()` tail calls `repaintScreen(n)`, `xapiOnScreen(n)`, `scheduleResumeSave()`;
every graded `*Check()` calls `xapiAnswered(...)` once per catalogue question and flushes the state
(D-13); every `*OpenHint()` reports `xapiRequestedHint` after its guard; the last screen's
`advanceScreen()` calls `partFinish()` instead of hopping to the next part (the hop survives only
under `DEV_NAV`, i.e. `?dev=1` without `?registration`).

## Statements

- Component: `initialized` on every launch; `completed` on the part's last click — pass **and** fail —
  with `{success, score.scaled}` = correct / all graded catalogue questions of the part (unanswered =
  wrong), success at `XAPI_PASS`. Nothing at unit level.
- Item: `initialized` when a screen of a new item is entered (again on every re-entry), `completed`
  once (ledger); an evaluated item is closed only after an `answered` (B-1).
- `answered` on every attempt, `answered.last` on the resolving one; `result.response` = the
  catalogue strings in the xAPI format of the metadata `questionType` (20-xapi.js `xapiResponse`).
  Where a card shows a shorter label than the catalogue string (the density in parentheses), the call
  site passes catalogue **indexes** instead of the label — the on-screen order equals the catalogue
  order there, verified per question on 2026-11-02 (`RESPONSE-EXAMPLES.md`).
- `requested.1` (hint): object = the question; once per question (hints ledger, survives reloads).
- No `selected` (no learning path in this unit), no `played` / `paused` (every clip is a muted
  decorative loop; the part-01 hook video is narrative, not an instructional item).

## Catalogue map

| part | screens → items | graded (call sites) | pass |
|---|---|---|---|
| 01 | s0–s1 001 · s2–s3 002 · s4–s7 003 · s8 004 · s9–s14 005 · s15 006 · s16–s18 007 · s19 008 · s20–s21 009 · s22–s23 010 · s24–s26 011 · s27 012 | 002/q1 performance (cubes table, 1 attempt) · 002/q2, 004/q1, 006/q1, 012/q1 choice · 008/q1, 011/q1 matching | ≥ 0.6 |
| 02 | s0–s3 001 · s4 002 · s5 003 · s6 004 | 001/q1 performance (9 typed values) · 001/q2 matching · 002/q1 choice (drag UI) · 003/q1–q4 true-false (1 attempt) · 004/q1 matching | ≥ 0.6 |
| 03 | s0–s1 001 · s2 002 · s3 003 · s4 004 · s5–s6 005 · s7 006 | 001/q1 choice (dropdown) · 002/q1, 003/q1, 005/q1 choice · 004/q1 performance (2 dropdowns) · 006/q1 matching | ≥ 0.6 |
| 04 | s0–s2 001 | none — the catalogue item is a classroom task without questions; `completed {success: true}`, no score | — |
| 05 | s0–s1 001 · s2 002 · s3 003 · s4 004 | 001/q1, 002/q1 matching · 003/q1 choice (multiple) · 004/q1 sequencing | ≥ 0.6 |
| 06 | s0–s5 001 | 001/q1, q2, q4 choice · q3 matching (paragraph blanks) | ≥ 0.75 |
| 07 | s0–s5 001 | 001/q1 matching (2 dropdowns) · q2 sequencing · q3, q4 choice | ≥ 0.75 |

Screen numbers are `data-screen` values (part 06 keeps s5 before s4 in the DOM; the map is by number).

## Decisions (confirmed by the owner, 2026-11-02)

- **Pass thresholds**: no part promises a threshold on screen. 0.6 is the family default; 0.75
  (3 of 4) for the two peak questions follows mass-gas-01 parts 05/06. Confirmed 2026-11-02.
- **Part 04** ends with `completed {success: true}` and no score: the catalogue carries no question
  for the dropdown screen, so a score would be invented. Confirmed 2026-11-02: the dropdown verdict
  stays local.
- **Part 06 q3** accepts the two polymer names in either of blanks 1–2 and 4–5 (`FBD.accept`); the
  response reports the placement as made, so a swapped-but-accepted answer carries `success: true`
  with a response that differs from Kata's pattern string.
- Ungraded questions: none in the catalogue.

## Checks

```
node _test/verify-assets.js
NODE_PATH=<jsdom dir> node _test/verify-report.js      # 2,899 checks incl. the jsdom runtime group
```
Browser walk with the offline stub: `_test/README.md`. Record of the 2026-11-02 walks:
`docs-and-tools/STUB-WALK-2026-11-02.md`.

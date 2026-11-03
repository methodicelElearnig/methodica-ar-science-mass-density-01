# Live Kata verification — methodica-science-mass-density-01, 2026-11-02

Guide §12 probes against the deployed unit and the real catalogue, run from the Claude desktop browser
pane (Chromium) on launch URLs minted by `Tools/full-kata-link/New-KataLaunchLinks.ps1 -UnitKey
methodica-science-mass-density-01 -ResetState` (7 components, one registration each, test learner
`VADIM-1234`, platform `https://no-platform.com`). The links live in the tool's CSV and were opened through a
temporary localhost launcher page, deleted afterwards. **Rotate the reporting token**: the registrations
were minted for this run, and one tool result echoed a launch URL during the run (§6.3).

Package `../../deployments/2026-11-02` (files cut at `b218be6`; PR #1 and PR #2 merged to `main` as
`c1f7387` / `c673032` at 20:09–20:11 UTC — the shipped tree is byte-identical, see `DEPLOY.md`).

Statements were observed with a counting **pass-through** wrapper on `sendStatement720` (and
`xapiAnswered`), never a replacement. Booleans, sizes and status codes only; anything not listed under a PASS
was not observed. Screens were driven through each part's own handlers (`goTo`, the `sNSelect` / `sNTap` +
`sNZoneClick` pairs, the check buttons), not by synthetic DOM events.

## 1. Catalogue

- Before: `retrieve-metadata.ps1` → `GET /api/v1/content-units/methodica-science-mass-density-01` **404**
  (`resource.not_found`). `send-metadata.ps1 -DryRun` → `created=37 updated=1 failed=0`
  (`send-metadata-2026-11-02-dryrun.log`).
- **Live send #1** (`send-metadata-2026-11-02-create.log`): unit + 7 components + 26 items created (HTTP 201),
  the `03 → 02` `recommendedAfterFail` PATCH 200, **3 items rejected with HTTP 422**:
  `01-002`, `02-001`, `03-004` — *"performance question correctAnswers must carry at least one step"*. Their
  `performance` questions were authored as `steps: [{name, type, min/max | correctAnswer}]`, a shape no other
  unit uses; Kata (and body-matter-01, percent-05, the Arabic twins) use `answers: null`,
  `correctAnswers: [{stepId, response}]` with `stepId` = the step name.
- **Fix** in `metadata/` (3 files): each `steps[]` rewritten as `correctAnswers[]` (`stepId` = `name`,
  `response` = the exact `min`=`max` number as a string, or `correctAnswer`). The runtime already reads both
  shapes (`unit-js/20-xapi.js` → `xapiQMeta`, since 2026-10-21) and the harness accepts both
  (`_test/verify-report.js` H-performance), so the statements the unit sends did not change:
  `node _test/verify-assets.js` 1476/1476, `verify-report.js` 2899/2899 after the edit.
- **Live send #2** (`send-metadata-2026-11-02-fix-performance.log`): `created=3 updated=35 failed=0` — the
  three items created, everything else PATCHed in place (idempotent upsert).
- **Audit** (`retrieve-metadata-2026-11-02-after-create.log`): `retrieve-metadata.ps1 -KeepRaw -FailOnDrift`
  → `unit=1 components=7 items=29 warnings=0`, exit 0. A field-level comparison of `metadata/` with
  `metadata-from/` (ignoring what Kata adds: `createdAt`, `updatedAt`, `manufacturer`,
  `correctXapiResponsesPattern`, `xapiInteractionComponents`) → **0 differences in all 8 files**. The text
  diff is formatting only (the formatter's array budgets were fitted to another unit — `RETRIEVE-METADATA.md`).
- Kata's derived `correctXapiResponsesPattern` for the three performance questions equals, character for
  character, the response the unit sends (`RESPONSE-EXAMPLES.md`; observed live below for 02-001 and 03-004).
- **Published 2026-11-03**: all seven components `POST …/component/publish` → 200, read back `published`, no
  `publishBlockers`; the unit stays `in_progress` (`SEND-METADATA.md` → Published).
- ⚠️ The three edited metadata files now differ from the package and the CDN (27,087 / 16,102 / 13,662 bytes
  locally vs 28,257 / 16,971 / 13,779 live). The live unit is not affected (both shapes are read), but the
  tree ↔ package ↔ CDN parity rule needs a commit and a re-upload of `metadata/…-01.json`, `-02.json`, `-03.json`.

## 2. CDN — `https://lomdot.education.gov.il/metodica/720/science/mass-density/01/`

**Before the upload (~20:00 UTC):** the seven part folders already served a **foreign component** — mass-measure-02
part 05 (`index.html` 24,424 / `script.js` 50,825 / `styles.css` 17,278 bytes, identical in every folder,
`XAPI_METADATA_FILE` pointing at `methodica-science-mass-measure-02-05.json`, plus an `index_dev.html` of
5,150 bytes); `unit-js/`, `unit-css/`, `metadata/`, `assets/` answered 200 with 0 bytes. Same pattern as
ratio-02 in `QA/2026-09-20/LINK-AUDIT.md`.

**After the upload (`Last-Modified: Mon, 02 Nov 2026 20:13:40 GMT`, CloudFront `X-Cache: Miss`):** every
package file compared by byte size with a cache-busted GET — **140 / 140 match, 0 missing, 0 different**;
`index_dev.html` answers 0 bytes in all seven parts. Plain, `no-cache` and cache-busted fetches agree.

Shared library, the URL `50-loader.js` loads: `…/metodica/720active/common/xapi-720-k.js` → **52,370 bytes**,
`stateReason720` ×2, `__failWrites` ×0 — the real build (guide §11.3).

**Off-platform boot** of part 01 from the CDN (no launch query): `xapiwrapper.min.js` + `xapi-720-k.js`, then
`10 → 20 → 25 → 40 → 50 → 05-media → 05-motion → 90`; `XAPI_DISABLED true`, `XAPI_USING_G true`,
`DEV_NAV false`, `METADATA.id === XAPI_COMP_ID`, 0 requests to `kata.cet.ac.il`, no zero-byte resource, no
console errors — **PASS**.

## 3. Common to all seven launches

| Probe | Observed on every component |
|---|---|
| R1 preflight | content origin `lomdot.education.gov.il`, launch envelope present, `registration` 36 chars; scripts `xapiwrapper.min.js`, **`xapi-720-k.js`** from `720active/common/`; `XAPI_DISABLED false`, `XAPI_USING_G true`, `DEV_NAV false`, `METADATA.id === XAPI_COMP_ID`, `_resumeReady true`, boot cover gone, `_unitState = {v: 5, component: <own slug>, payload: null}`; no iframe in any part; no zero-byte resource — **PASS** |
| R2 first read | `{op: 'load', status: 404, ok: true, reason: 'absent'}` — **PASS** (token accepted, URL right, no state yet) |
| Load | exactly **2** `POST …/xapi/statements` per load (component + landing item `initialized`), also after every reload |
| Network | every statement POST **200**; state reads 404 (first) / 200, writes **204** |
| Console | pattern `deferring / unreachable / mismatch / error / failed / warn / not in metadata / persist`: **no messages** on any component |
| The last button | the first click **checks** (sends `answered.last`); the same button, relabelled, is the part's continue: its click sends the item `completed` and **one** component `completed`, then disables (`disabled`, `aria-disabled="true"`); a further click sends **0**; `location.pathname` unchanged (Kata, not the unit, routes) |
| D-8 after the finish | reload → lands on the last screen, answers painted, `xapiComponentEnded() === true`, button disabled, a click sends 0 (beyond the 2 load `initialized`) |
| R7 `?resetState` | parameter stripped (the launch query kept), `done = {}`, `doneItems = {}`, `hints = {}`, `xapiComponentEnded() === false`, screen 0, fresh `{save, 204}` |

## 4. Component 02 (practice: 001 performance + matching, 002 choice, 003 4 × true/false, 004 matching) — full §12 set

| Probe | Observed |
|---|---|
| R3 write / read back | `goTo(1)` → `{save, 204}`; `loadState720('execution-state::…-02')` → `{load, 200}`, v5, keys `v, component, payload, done, doneItems, hints, picks, ui, results` (no `part` / `prev` / `parts`), payload `{currentScreen: 1, qResults, vars (45), dom.inputs}` — **PASS** |
| Wrong attempt | 9 values with one wrong → `answered` 001/q1 `{success: false, scaled: 0}`, `response` = the 9 `name[.]value` steps, synchronous `{save, 204}`, `s2qAttempts 1`, retry gate on — **PASS** |
| R4 reload mid-question | lands on screen 2, the 9 typed values painted, the wrong field marked `is-error`, check disabled (retry gate), `s2qAttempts 1`; first read `{load, 200}`; `XAPI_DISABLED` still false; 2 `initialized` — **PASS** |
| Hint | opened twice → **one** `requested.1` 001/q2; document `hints['001/q2'] = true` — **PASS** |
| `answered.last` | 001/q1 `{success: true}` after the fix; 001/q2 matching `{success: true}`, response `נחושת (צפיפות: 8.96)[.]הקו העליון בגרף[,]…` — **PASS** |
| Item boundary | leaving 001 → `completed` 001 `{success: true, scaled: 1}` + `initialized` 002; `doneItems['…-02#001'] = true` — **PASS** |
| R5 ledger | **after a reload**, screens 3 ↔ 4 crossed 6 times → **6 × `initialized`** (001/002 alternating), **0 × `completed`** — **PASS** |
| 002 / 003 | 002/q1 drag-choice `answered.last` ok; 003 q1–q4 single attempt, q2 wrong → 003 `completed` (`doneItems`); 17 statement POSTs since the reload = the predicted count — **PASS** |
| R6 finish | 004 matching → `answered.last` `{success: true}` (5 pairs); continue → `completed` 004 `{true, 1}` + component `completed` **`{success: true, scaled: 0.875}`** (7 of 8, threshold 0.6); further clicks 0 — **PASS** |
| D-8 / R7 | as in §3 — **PASS** |

## 5. Components 01, 03, 04, 05, 06, 07

| Comp. | Walk | Resume (R4 reload mid-question) | Finish |
|---|---|---|---|
| **01** instruction, 12 items, 8 `<video>` | R3 204/200; leaving 001 → `completed` 001 (no result) + `initialized` 002; table 002/q1 (performance, 12 steps, one attempt) → `answered.last {true}` (the ratio column is auto-computed, so a planted error is overwritten); 002/q2 wrong → `answered {false}`, response = option text; hint ×2 → one `requested.1`; then 004, 006, 008 (6-card matching), 011 (numerator/denominator), each `answered.last {true}` → item `completed {true, 1}` on leaving; instruction item 003 `completed` with no result | lands on screen 3, the wrong option painted (`wrong`), attempts 1, read 200, 2 `initialized` — **PASS** | 012 check → `answered.last`; continue → `completed` 012 + component **`{true, 1}`** (7/7); extra 0; D-8, R7 **PASS** |
| **03** practice, 6 items | dropdown 001/q1 wrong (`כמות`) → `answered {false}`, `response` `כמות`; hint ×2 → one `requested.1`; 002 `a`, 003 `d`, **004 performance (2 dropdowns)** → `answered.last`, response `צפיפות המים (גרם/סמ"ק)[.]1[,]התנהגות חומר בצפיפות 2.3 במים[.]ישקע` = Kata's pattern; 005 `b`; 006 word-matching | lands on screen 1, `כמות` painted in the dropdown button, attempts 1, read 200 — **PASS** | 006 check → `answered.last`; continue → `completed` 006 + component **`{true, 1}`** (6/6); extra 0; D-8 (placement painted), R7 **PASS** |
| **04** classroom task, 1 item, no catalogue question | `XAPI_PASS 1`, `XAPI_PART_QUESTIONS []`; six dropdowns, one wrong → check → **0 statements** (local verdict, attempts 1); all right → check → 0 statements, button `שנמשיך?` | **FAIL on the morning package — fixed and re-checked live the same evening, PASS (§6.1)** | continue → `completed` 001 **(no result)** + component **`completed {success: true}`, no score** — exactly the owner's decision; extra 0; D-8 (after the finish the picks *are* painted — `partFinish` flushes), R7 **PASS** |
| **05** challenge, 4 items | 001/q1 matching wrong (distractor in the claim zone) → `answered {false}`, pairs ranked correct-first; hint ×2 → one `requested.1`; fix → `answered.last`; 002 float/sink, 003 multi-choice (`shir`, `amir`), 004 sequencing (6 steps, response in zone order) | lands on screen 1, placement + 3 marks painted, attempts 1, retry gate — **PASS** | 004 check → `answered.last`; continue → `completed` 004 + component **`{true, 1}`**; extra 0; D-8, R7 **PASS** |
| **06** peak, 1 item × 4 q, `XAPI_PASS 0.75` | q1 wrong twice (`a`, `d`) → `answered {false}`, `answered.last {false}`; hint ×2 on q2 → one `requested.1` 001/q2; q2 `c`, q3 fill-blanks-drag (6 blanks) → `answered.last` with the `RESPONSE-EXAMPLES.md` string; q4 `c` | lands on screen 2, `a` painted, attempts 1, retry gate — **PASS** | continue → item `completed` **`{success: false, scaled: 0.75}`** (an item succeeds only when all its questions are right) + component **`completed {success: true, scaled: 0.75}`** — the 0.75 threshold is inclusive; extra 0; D-8, R7 **PASS** |
| **07** peak, 1 item × 4 q, `XAPI_PASS 0.75` | q1 two dropdowns wrong → `answered {false}` (correct pair ranked first); hint ×2 → one `requested.1`; fix → ok; q2 sequencing wrong ×2, q3 choice wrong ×2 → `answered`, `answered.last {false}` each; q4 `c` ok | lands on screen 2, both dropdown texts painted, attempts 1, retry gate — **PASS** (the save came through `xapiAnswered`; contrast with 04) | continue → item `completed {false, 0.5}` + component **`completed {success: false, scaled: 0.5}`**; extra 0; D-8, R7 **PASS** |

## 6. Findings

### 6.1 Part 04 — the dropdown state is not saved until the finish (resume)

Reproduced three times. On screen 2, after six picks and a wrong check (`s2Attempts 1`), the document's last
write is still the one from entering the screen; 3.5 s later nothing more was written (`payload.vars.s2Selected`
all `null`, `s2Attempts 0`). A reload then lands on screen 2 with empty dropdowns and `s2Attempts 0`. A third
try — three picks, no check, reload — lost the picks as well. Cause, from the code: part 04 has no `xapiAnswered`
call (the catalogue item has no question), and `xapiAnswered` is where every other part flushes the state
synchronously after an attempt; `s2Select` and the retry branch of `s2Check` call neither `flushResumeSave()`
nor `scheduleResumeSave()`. The leave-time flush (`beforeunload` / `pagehide` → synchronous `XMLHttpRequest`
PUT in `saveState720`) **did not persist on any of the three reloads** — Chromium disallows synchronous XHR
during page dismissal, so that safety net is not one (inferred from the behaviour; the library is the
platform's). Impact: a learner who reloads mid-task redoes the dropdowns; no statement is affected (part 04
reports nothing per question). Fix in `methodica-science-mass-density-01-04/script.js`: `flushResumeSave()`
in `s2Check` after a wrong attempt (D-13) and `scheduleResumeSave()` in `s2Select`. Family-wide: the
leave-time flush should use `fetch(..., {keepalive: true})` or `sendBeacon` — a library change.

**Fix applied the same evening** (`methodica-science-mass-density-01-04/script.js`): `scheduleResumeSave()` at the end
of `s2Select`, `flushResumeSave()` in the retry branch of `s2Check`; the unit-wide cache-buster bumped
`20261102b → 20261102c` in all seven `index.html` (the harness enforces one value, §3.4). Harness: 1476/1476,
2899/2899. **Offline proof** (stub library, `?registration=t1&xapiLib=../_test/xapi-720-k.js&resetState`): three
picks → a debounced `{save, 204}` 1.2 s later with `payload.vars.s2Selected` holding them; wrong check → a
synchronous `{save, 204}` with `s2Attempts 1`, `s2LastWrong[6]`; reload → screen 2, all six picks painted, the
wrong one marked `dq-wrong`, check disabled (retry gate) — **PASS**. **Live re-check on component 04 — PASS** (package `../../deployments/2026-11-02b`, commit `c5b02a3`, uploaded
~21:50 UTC; CDN 140 / 140 by size, all seven `index.html` carry only `20261102c`, part 04 `script.js` 31,828 bytes with
both save calls, the metadata in the Kata shape): launched through Kata with the part-04 registration, `script.js?v=20261102c`,
`XAPI_DISABLED false`; three picks → `{save, 204}` 1.5 s later with the picks in `payload.vars.s2Selected`; six picks + a
wrong check → synchronous `{save, 204}` with `s2Attempts 1`, `s2LastWrong[6]`; **reload → screen 2, all six picks painted,
the wrong one marked `dq-wrong`, check disabled (retry gate), first read 200, 2 `initialized`**; `?resetState` clean; console
clean. §6.1 is closed for this unit; the leave-time-flush limitation of the library stands.

### 6.2 Catalogue — `performance` questions need the Kata shape

`steps[]` is rejected with 422 (§1). The runtime reads both shapes; only the catalogue does not. Worth a check
in the metadata extractor and in the harness (H-performance accepts `steps[]`, so it did not catch this).

### 6.3 Token exposure

The `find` browser tool echoed a launch link's `href` once (component 02) — the token reached a tool result.
Launch pages must be driven by element id through `javascript_tool`, never read with `find` / `read_page`.
Rotate the token.

## 7. Not observed (unverified)

- `played` / `paused` on part 01's eight `<video>` elements; the issue-report POST from the production origin.
- Part 01 items 005, 007, 009, 010 (instruction) — skipped by direct `goTo` jumps, so their `initialized` /
  `completed` were not seen live (the linear walk in the stub record covers them).
- Kata's hand-off after `completed`, routing by `recommendedAfterFail` (03 → 02), the statements as stored in
  Kata (the reporting token may not search statements — §12.1).
- Multi-tab (R9), tab close (R7 of the QA campaign), stale `?v=` (R8).
- The state documents were **emptied** with `?resetState`, not deleted; the test learner's statements remain
  in Kata.

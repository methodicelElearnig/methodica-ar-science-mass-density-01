# methodica-science-mass-density-01 — מדעים · יעד 10 · צפיפות

720 Science unit, seven self-contained parts (one per PPTX רכיב), canvas 1280×710, per-screen
`script.js` engine (static `<section class="screen">` blocks, `goTo` / `advanceScreen` / `backScreen`).
In a platform (Kata) launch every part ends with its own xAPI `completed` and stays — Kata decides what
comes next; the cross-part hops run only in the local walkthrough (`?dev=1`, no `?registration`).

## Layout
```
metadata/               the catalogue (unit + 7 components) — source of every reported id
unit-js/ unit-css/      720 platform layer — xAPI reporting, issue report, resume (10/20/25/40/50/90),
                        plus 05-media.js (lazy media) and 05-motion.js + motion.css (system animation)
unit-assets/            fonts, icons (incl. the report flag) and clips shared by several parts, one copy each
_test/                  verify-assets.js · verify-report.js · xapi-720-k.js (offline library stub) · README (browser walk)
docs-and-tools/         REPORT-XAPI · RESUME · RESPONSE-EXAMPLES · STUB-WALK · OPTIMIZATION-REPORT · MEDIA-CHANGES ·
                        reencode-media.py (+ media-display-boxes.json) · send/retrieve-metadata.ps1 · packaging scripts
scripts/serve.py        local static server (python scripts/serve.py → http://127.0.0.1:8765)
methodica-science-mass-density-01-NN/
  index.html            production entry (boot cover, report dialogs, the layer's script tags, one ?v=)
  index_dev.html        DEV bar (screen jumping via postMessage) — never shipped
  script.js             this part's screens + the xAPI seams, call sites and the four resume hooks at its end
  styles.css assets/    this part's styles and media; applet/ in parts 01 and 02
```

## Reporting and resume (720 platform layer, 2026-11-02)
Shared layer from `methodica-science-mass-gas-01` (2026-11-02 state), per-part pattern from
`methodica-science-body-matter-01`, per `Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`.
Details: `docs-and-tools/REPORT-XAPI.md` (lineage, catalogue map, decisions), `RESUME.md`,
`RESPONSE-EXAMPLES.md`.
- Ids from `metadata/` only; responses = the catalogue strings in the xAPI format of the question
  type (indexes where a card's label is shorter than the catalogue string).
- Component `completed` on the last click, pass and fail, score = correct / all graded catalogue
  questions; `XAPI_PASS` 0.6, 0.75 for the two peak parts (confirmed 2026-11-02). Part 04 (a
  classroom task without questions) completes with `success: true` and no score (confirmed).
- Resume: Kata State API document per component (`?registration`); every per-screen variable, the
  typed inputs and the dropdown texts are saved; one painter per interactive screen. `?resetState`
  starts clean.
- No character selection and no learning path in this unit.

## Optimization (2026-11-02)
75.9 MB → 18.0 MB shipped (−76 %) with every file's format kept — `docs-and-tools/OPTIMIZATION-REPORT.md`.

## Checks
```
node _test/verify-assets.js
NODE_PATH=<jsdom dir> node _test/verify-report.js
```
Browser walk with the stub: `_test/README.md`. Package: `pwsh -File docs-and-tools/build-package.ps1`
then `verify-package.ps1` (allowlist in `package-allowlist.ps1`; output `../../deployments/<date>/`).

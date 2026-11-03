# Tests — methodica-science-mass-density-01

Not shipped (`_test/` is outside the package allowlist).

## Static + headless

```
node _test/verify-assets.js                                    # asset contract (1,476 checks)
NODE_PATH=<jsdom dir> node _test/verify-report.js              # reporting / issue report / resume (2,899 checks)
```

jsdom (~26 MB) must live **outside** this OneDrive-synced tree:

```
mkdir -p /tmp/lomda-test && cd /tmp/lomda-test && npm install jsdom
# Git Bash on Windows: node needs the Windows spelling of the path
NODE_PATH="$(cd /tmp/lomda-test/node_modules && pwd -W)" node _test/verify-report.js
```

Without jsdom the static groups still run and the runtime group is skipped. `verify-report.js`
asserts the catalogue identity, every part's page wiring (script order, boot cover, dialogs,
`SCREEN_TO_SUBCONTENT` ↔ DOM ↔ catalogue, `XAPI_EVAL_ITEMS`, `XAPI_PART_QUESTIONS`, the last-screen
`partFinish`, no cross-part hop outside `DEV_NAV`), the response layer (H1–H13: a spec object at
every `xapiAnswered`, one call site per declared question, canonical strings round-tripped from the
catalogue), and in jsdom: the regression gate without the library, the statement flow with an inline
recorder (one `initialized` per item change, B-1, one component `completed` for two finish clicks,
D-8 after a reload), the part result and its threshold, the resume stage-A round trip and a painter
sweep with every question forced solved.

## Browser walk (offline stub)

Serve the repo (`python scripts/serve.py`, port 8765) and open a part with the stub library — on
localhost only, `50-loader.js` honours `?xapiLib`:

```
http://localhost:8765/methodica-science-mass-density-01-06/index.html?registration=t1&xapiLib=../_test/xapi-720-k.js&resetState
```

Console: `__stmts()` (statement log, survives reloads), `__state()` (the state document), `__dupes()`
(duplicate `completed`), `__failWrites(413)`, `__reset()`. Start every walk with `&resetState`.

Walk per part: answer wrong then right (→ `answered`, `answered.last`), open a hint twice (→ one
`requested`), reload mid-question (→ same screen, marks painted, only `initialized` re-sent), finish
(→ item `completed`, component `completed` with `{success, score}`, the button disabled, no
navigation), reload after the finish (→ button still disabled, a click sends nothing). Without
`?registration` and with `?dev=1` the parts hop to each other as before.

The record of the 2026-11-02 walks (statement lists per part, resume probes) is
`docs-and-tools/STUB-WALK-2026-11-02.md`.

Never submit the issue-report form in a test: it posts to the Google Form shared by every 720 unit.

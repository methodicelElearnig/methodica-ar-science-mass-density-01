# Resume — methodica-science-mass-density-01

Kata xAPI State API, one document per component keyed by the launch's `?registration`
(`'execution-state::' + part slug`, document v5 — guide §8). Without `?slxapi` / `?registration` the
library's localStorage fallback holds the same document (`?resetState` starts clean).

## What is saved (every part, generated 2026-11-02)

`capturePartPayload()` at the bottom of each `script.js`:

```
{ currentScreen,
  qResults: XAPI_Q_RESULTS,
  vars: { <every top-level per-screen state variable> },   // 60 / 45 / 42 / 8 / 39 / 26 / 28 per part
  dom:  { inputs: { <input id>: value }, dq: { <dq-selected-* id>: { t, empty } } } }
```

The `vars` list is the part's own top-level `let` / `const` declarations with a screen prefix
(`s3qSelected`, `s19Placement`, `fbdMarks`, `frcFlipped`, `axState`, `practiceProgress`…), minus the
transient ones (pointer-DnD instances, timers, popup drags). A `Set` travels as `{__set: [...]}`; a
`const` object or array is refilled in place on restore, never re-bound. `dom` carries what lives only
in the DOM: the typed values of the cubes table (part 01) and the density lab (part 02), and the text /
placeholder state of every dropdown button.

## When

Debounced on every `goTo` (`scheduleResumeSave`), synchronously after every graded check and the
part's last click (`flushResumeSave`, D-13), and on `beforeunload` / `pagehide` /
`visibilitychange:hidden` (shared layer).

## Restore and painters

`applyExecutionState` (shared): `applyResumeVars` → `goTo(currentScreen)` (whose `resetScreenStateN`
already repaints a solved screen from the restored variables — this unit's re-entry functions paint
locked solutions, dropdown values, flipped cards, rendered drag boards) → `applyResumeVars` again →
`applyResumeDom` (inputs, dropdown texts) → `restoreScreenUI(n)` → `restoreEndedButton` (D-8).
`repaintScreen(n)` runs `restoreScreenUI` on every later navigation.

`restoreScreenUI` dispatches one painter per interactive screen, by template:

| template | painter | solved | in progress (attempts > 0) |
|---|---|---|---|
| single choice (`sNq*`) | `rsPaintScq` | mark the chosen option, reveal the correct one on a final miss, `sNqFinish`, reopen the feedback | the wrong mark only while the submitted option is still selected (rule 10), hint button, Retry gate, retry feedback |
| drag & drop (`sN*`, `fbd*`) | `rsPaintDnd` | reopen the feedback (the board was rendered by `resetScreenStateN`) | `sNRender` from the restored placement + marks, hint, retry feedback when the board still equals the submitted one, `sNUpdateCheck` |
| dropdowns (`sN*` × k) | `rsPaintDd` | reopen the feedback | texts via `applyResumeDom`, placeholder state, per-dropdown marks, hint, gate |
| value input (02 s2), cubes table (01 s2), true/false (02 s5), multiple choice (05 s3) | inline cases | reopen | marks from the restored values, gate |

Everything else (transitions, narrative, the part-01 sequence / highlight / axes / applet-gate screens)
repaints from the restored variables inside its own `resetScreenStateN`; the part-01 graph-building
screens 13–14 restore their gate flags only.

## Probes run on 2026-11-02 (offline stub, `_test/README.md`)

- Part 06: reload mid wrong attempt → same screen, wrong mark, Retry gate, retry feedback, only
  `initialized` re-sent; partial paragraph placement restored; after the finish click a reload shows
  the locked end button and a further click sends nothing (one component `completed` in total).
- Part 02: 9 typed values and the true/false picks come back; after a wrong attempt the error marks
  and the retry feedback return. Part 03: dropdown texts, wrong marks, gates and feedback. Part 05:
  the multiple-choice `Set`. Part 01: flipped cubes, table values, a solved choice painted, an
  in-progress choice with hint and gate.

Known limitation (shared layer): Chrome may block the synchronous state write on page dismissal
(`Documentation/reporting-and-resume/KNOWN-ISSUE-dismissal-state-write.md`); the debounced write on
every navigation bounds the loss to the last screen.

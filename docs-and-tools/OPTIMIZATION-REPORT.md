# Optimization report — methodica-science-mass-density-01 (2026-11-02)

Done before the reporting/resume work, as in methodica-science-mass-gas-01 (2026-11-01),
mass-liquid-02 and body-matter-01 (guide `Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md`
§15: "do it before reporting pins the paths"). Rule from the owner's decision of 2026-10-22: **every
file keeps its format** — no WebP/MP4 conversion of PNG/GIF, no minification. Owner decision for this
unit (2026-11-02): full gas-style pass — dedupe, hoist, in-place re-encode, lazy media.

## Result

Bytes in the tree that ships (`git ls-tree -r -l`), baseline = `6eac800`.

| folder | before | after | saved |
|---|---:|---:|---:|
| methodica-science-mass-density-01-01 | 31,295,222 | 7,857,705 | 75 % |
| methodica-science-mass-density-01-02 | 3,710,581 | 841,851 | 77 % |
| methodica-science-mass-density-01-03 | 6,850,502 | 2,020,714 | 71 % |
| methodica-science-mass-density-01-04 | 4,272,813 | 1,092,188 | 74 % |
| methodica-science-mass-density-01-05 | 2,757,343 | 739,226 | 73 % |
| methodica-science-mass-density-01-06 | 13,492,285 | 2,963,211 | 78 % |
| methodica-science-mass-density-01-07 | 13,554,145 | 1,725,413 | 87 % |
| unit-assets/ (new, shared by all parts) | — | 744,495 | |
| unit-js/ + unit-css/ (new: 05-media.js, 05-motion.js, motion.css) | — | 15,624 | |
| **total shipped** | **75,933,346** | **18,000,427** | **76 %** |

Video: 50,0 MB → 9.5 MB. PNG/JPG: 21.4 MB → 6.3 MB. SVG and fonts untouched.

## Steps (one commit each)

0. **Hygiene and names** (`6af148b`, `a654b24`, `2ac50f0`): `.gitattributes` (LF, binaries),
   `.gitignore` rewritten (the old `*.md` rule would have dropped these docs), `scripts/serve.py`.
   Every shipped path made ASCII / lower-case / space-free (guide §4.5): `נהר-ירדן.mp4` →
   `jordan-river.mp4`, `Underwater Plastic Pollution Loop.mp4`, `Curious Submarine Explorer.mp4`,
   `Turquoise-avatar-*.mp4`, the typo `turquise-avatar-wieghting.mp4`. ⚠️ Windows' case-insensitive
   index swallowed the three case-only renames on the first try; the repo now sets
   `core.ignorecase=false` and the guard (step 5) checks the index-side spelling.
1. **Unreferenced files removed** (`ee2562e`, `6384701`): a file is unreferenced when its name occurs
   in none of its part's html/js/css with comments stripped. Part 01: `axes-img01.png`,
   `axes-img02.png`, `axes-img03.png` (1.3 MB; the shipped axes images were derived from them).
2. **Hoisted** (`3d30699`) — byte-identical copies, proven by MD5 (guide §15.2 rule 1), kept once:
   the two Assistant woff2 (×7) → `unit-assets/fonts/`; 29 icons (×2–6; part 01's
   `assets/icons/<x>.svg` equalled parts 06/07's `assets/images/icon-<x>.svg`, the `icon-` name is
   kept) → `unit-assets/icons/`; `turquoise-avatar-weighting.mp4` (02, 03) and
   `turquoise-avatar-climbing.mp4` (06, 07) → `unit-assets/videos/`; `motion.js` ×7 →
   `unit-js/05-motion.js`, `motion.css` ×7 → `unit-css/motion.css` (percent-02 precedent).
   251 references rewritten with anchored replaces. A part's `index.html`, `styles.css` and
   `script.js` all sit in the part folder, so every hoisted path is `../unit-…/` from all three
   (the applet scripts are loaded by the part's document and resolve the same way).
3. **Re-encoded in place** (`ce4c32f`) by `docs-and-tools/reencode-media.py` (port of gas-01's):
   50 images (−15.3 MB) and 14 videos (−35.8 MB), one row per file in `MEDIA-CHANGES.md`. Target =
   2 × the largest box each file is drawn in, measured in the real pages on 2026-11-02
   (`media-display-boxes.json`: every screen via `goTo`, hidden popups forced visible, every zoom
   popup opened so zoomable images carry the zoom-stage box). PNG: LANCZOS → libimagequant 256
   colours (quality 70–95) → oxipng -o4; JPG q82 progressive; MP4: x264 crf 26 slow, +faststart.
   **Audio**: every clip had an AAC track; `jordan-river.mp4` (part 01 hook, not muted, PPTX slide-3
   note "sound of water") keeps it at 96 kb/s, the 13 muted decorative clips lose theirs.
4. **Lazy media** (`719f4af`): every `<img>` outside screen 0 carries `loading="lazy"`; every
   `<video>`/`<audio>` outside screen 0 carries `preload="none"` with `<source data-lazy-src>`
   (`autoplay` → `data-autoplay`). `unit-js/05-media.js` `wakeMedia(target)` runs in every part's
   `goTo()` before `resetScreenState(n)` (whose enter hooks `play()` the character clips): it
   switches the screen's images to eager and restores the clips' sources. Part 01 at boot now loads
   screen 0 only (was: 64 images and 7 preloaded clips). `?v=20261102` on all 40 code references.
5. **Asset-contract guard** (`6384701`): `node _test/verify-assets.js` — 1,283 checks (see its
   header). Mutation-tested: a wrong-case path, a missing `?v=`, an eager `<source>` outside screen 0
   and a re-grown hoisted copy each fail it.

## Checked

- Every part opened from the subpath (`python scripts/serve.py` →
  `http://localhost:8765/<part>/index.html`, which is where a wrong `../` depth 404s): zero 404s,
  fonts served from `unit-assets/fonts/`, every image of parts 01 (69) and 03 (16) loaded on its
  screen (`complete && naturalWidth > 0`), every deferred clip started on entering its screen, the
  part-07 audio ready, no console errors.
- `node _test/verify-assets.js` → 1283/1283.
- ⚠️ Known limitation of the check: the app's hidden browser pane produces no rendering frames, so
  native `loading="lazy"` alone never fetched (the intersection observer never ran). That is why
  `wakeMedia` also flips the entered screen's images to eager — correct in a visible tab too, and
  deterministic.

## Not done (by decision)

- No format change (PNG → WebP, MP4 → WebM), no minification (owner rule 2026-10-22).
- Git history not rewritten: `.git` still holds ~197 MB of the producer's raw media removed in
  `e913a88` (owner decision 2026-11-02: leave it).
- `index_dev.html` stays per part (dev-only; the package allowlist drops it).
- `unit-assets/videos/turquoise-avatar-weighting.mp4` is drawn at two sizes (533×300 in part 02,
  640×360 in part 03); it was encoded for the larger box.

'use strict';
/* ═══════════════════ xAPI (720) — identity ═══════════════════
   Shared by the seven parts of methodica-science-mass-density-01. Loaded first.
   methodica-science-mass-density-01 (2026-11-02): copied from methodica-science-mass-gas-01 (values replaced).
   Source: methodica-science-mass-liquid-02/unit-js/10-identity.js (2026-10-25 state, itself from
   body-matter-01 ← mass-weight-01 ← mass-measure-03), values replaced for this unit on 2026-11-01.
   Procedure: 2026/Documentation/reporting-and-resume/ADDING-REPORTING-AND-RESUME.md.

   Every id the lomda reports is built from these values and must match metadata/*.json byte for
   byte — including the trailing slash, which this unit's catalogue carries on component and item
   ids (not on questions, and not on the unit id, which is a bare slug — see below). Verified
   against metadata/ on 2026-11-01; _test/verify-report.js asserts it, and 50-loader.js compares
   XAPI_COMP_ID with window.METADATA.id on every load and shouts on a mismatch.

   Lowercase everywhere (ids, folder names, storage keys): Kata derives a uniqueKey from the last
   id segment, and currentPartSlug() derives the state key from location.pathname — a capital
   letter would split one learner's progress across two documents. */
var XAPI_ID_PREFIX = 'https://lomdot.education.gov.il/metodica/720active/science/mass-density/01/';

/* The unit id — a bare SLUG, not an IRI, equal to metadata/methodica-science-mass-density-01_unit.json
   `id` and to `learningUnitId` in every component JSON. MOE v2.5 §2.7 dropped the IRI requirement
   for the content unit only; components and items remain IRIs (hence XAPI_ID_PREFIX above).
   ⚠️ Never replace it with the prefix alone: Kata would take "01" as the uniqueKey and collide with
   every unit 01 of every subject. The issue-report form also posts shortId(learningUnitId) as the
   unit column of the sheet all 720 units share. */
window.XAPI_UNIT_ID = 'methodica-science-mass-density-01';

/* The last segment of a canonical id — the short slug the issue-report form records. */
function shortId(u) { return String(u || '').replace(/\/+$/, '').split('/').pop(); }

/* Resume (Kata xAPI State API) — ON: one state document per component; the four hooks
   (capturePartPayload / applyResumeVars / applyResumeDom / restoreScreenUI) are provided for every
   part at the bottom of its script.js (guide §8.7; docs-and-tools/RESUME.md).
   ⚠️ This flag also changes reporting, not only restoring: it makes 50-loader.js load
   xapi-720-k.js (the build with the State layer) instead of xapi-720-i.js. Do not switch it off to
   debug a restore — use ?resetState. */
var RESUME_ENABLED = true;

/* ── Navigation between parts: off in production, open only for a local walkthrough ──
   The platform (Kata) decides which component comes next: it launches each component on its own,
   with its own ?registration, reads our 'completed' and routes by the catalogue. Any in-unit hop
   would carry window.location.search along — i.e. report the next component under the previous
   component's registration. So every cross-part navigation (every part's last-screen hop to the next part, now inside partFinish) runs only when
   DEV_NAV is true, which requires BOTH:
     1. ?dev=1 in the URL — only index_dev.html / the developer sets it;
     2. NO ?registration — every Kata launch carries one, so a URL that has it is a real learner
        session, and ?dev=1 does not open navigation there.
   The component 'completed' is never gated on this flag: it is sent by the last click on the last
   screen, and the button is disabled after it. */
var DEV_NAV = false;
try {
  var _devQ = new URLSearchParams(location.search);
  DEV_NAV = _devQ.get('dev') === '1' && !_devQ.has('registration');
} catch (e) {}

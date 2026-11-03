/* ═══════════════════ Lazy media (optimization 2026-11-02, guide §15) ═══════════════════
   Every screen of a part is in the DOM from the first byte, so without this each <img> and each
   <video preload="auto"> of the whole part loaded at once (part 01: 64 images, 7 preloaded clips).

   The markup carries the deferral statically (no boot-time pass, nothing to race):
     • <img loading="lazy">              on every image outside screen 0 — a display:none screen's
                                         images stay unfetched until the screen is shown
     • <video preload="none" data-autoplay> with <source data-lazy-src="…"> — the clip's bytes are
                                         not requested until its screen is entered
   goTo() calls wakeMedia(target) right after resolving the target section and BEFORE
   resetScreenState(n), because several screens' enter hooks call video.play() themselves.

   Definition-only (guide §3.2): this file declares wakeMedia and nothing else runs here. Port of the
   deferMedia / wakeMedia pair in methodica-science-mass-gas-01 shared/engine.js (2026-11-01), adapted
   to <source> children and to the explicit play() of this unit's enter hooks. */
function wakeMedia(root) {
  if (!root || !root.querySelectorAll) return;
  /* Images: loading="lazy" keeps a hidden screen's images unfetched; on entry they are switched to
     eager so the fetch starts now, not when the intersection observer next runs (the observer runs
     only with rendering frames — a background/hidden document can sit on a visible-but-unloaded
     image for seconds). */
  root.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; });
  root.querySelectorAll('video, audio').forEach(function (v) {
    var woke = false;
    v.querySelectorAll('source[data-lazy-src]').forEach(function (s) {
      s.setAttribute('src', s.getAttribute('data-lazy-src'));
      s.removeAttribute('data-lazy-src');
      woke = true;
    });
    if (!woke) return;
    v.preload = 'auto';
    v.load();
    if (v.hasAttribute('data-autoplay')) {
      v.autoplay = true;
      v.play().catch(function () {});
    }
  });
}

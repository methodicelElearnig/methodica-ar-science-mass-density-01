'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling (הקנבס ממלא את ה-viewport, כמו סיינים 1–4), ניווט מסכים, סטייט גלובלי.
   מסך 1 = TransitionScreen (שקף 64); מסך 2 = שאלת גרירה: שאלה 1 מתוך 4 (שקף 65); מסך 3 = שאלת גרירה: שאלה 2 מתוך 4 (שקף 66); מסך 4 = רב-ברירה בתמונות: שאלה 3 מתוך 4 (שקף 67); מסך 5 = שאלת גרירה לפי סדר: שאלה 4 מתוך 4 (שקף 68).
   ========================================================= */

const TOTAL_SCREENS = 5;
let currentScreen = 0;

/* הדמות שתיבחר במסך הראשון (אם קיים מסך כזה ביחידה זו) תישמר ב-localStorage (כל סיין הוא מסמך HTML נפרד);
   try/catch: בפתיחה מ-file:// חלק מהדפדפנים חוסמים גישה ל-localStorage עם SecurityError */
const CHARACTER_STORAGE_KEY = 'methodica_science_mass_density_01_selectedCharacter';   /* = UI_CHARACTER_KEY in ../unit-js/40-resume.js (D-6) */
let savedCharacter = null;
try {
  /* 720 platform layer (guide §8.7): the document first, the per-unit cache as fallback; a shared file
     that failed to load degrades to the cache-only read instead of throwing at top level. This unit
     has no character selection, so the value is always null — kept for the template's sake. */
  savedCharacter = (typeof getUnitCharacter === 'function') ? getUnitCharacter() : localStorage.getItem(CHARACTER_STORAGE_KEY);
} catch (e) { /* localStorage חסום (opaque origin/פרטיות) — נמשיך בלי שמירה */ }
window.lomdaState = {
  selectedCharacter: savedCharacter || null
};

/* הקנבס ממלא את כל ה-viewport (כמו סיין 1): ה-scale הוא min של שני היחסים (בלי עיוות),
   ו-#app מתרחב כך שאחרי ה-scale אין פסים לבנים. התוכן מוסט ב---ex למרכז מסגרת ה-1280. */
const CANVAS_W = 1280, CANVAS_H = 710;

function scaleApp() {
  const app = document.getElementById('app');
  const scale = Math.min(window.innerWidth / CANVAS_W, window.innerHeight / CANVAS_H);
  const canvasW = window.innerWidth / scale;
  const canvasH = window.innerHeight / scale;
  app.style.width = canvasW + 'px';
  app.style.height = canvasH + 'px';
  app.style.setProperty('--ex', Math.max(0, (canvasW - CANVAS_W) / 2) + 'px');
  app.style.transform = 'scale(' + scale + ')';
  app.style.left = '0px';
  app.style.top = '0px';
}
window.addEventListener('resize', scaleApp);
scaleApp();

function getCanvasSize() {
  const app = document.getElementById('app');
  return { w: parseFloat(app.style.width) || CANVAS_W, h: parseFloat(app.style.height) || CANVAS_H };
}

function goTo(n, viaBack) {
  dndGhStopAll();
  if (n < 0 || n >= TOTAL_SCREENS) return;
  if (currentScreen === 1 && n !== 1) s1ClosePopups();
  if (currentScreen === 2 && n !== 2) s2ClosePopups();
  if (currentScreen === 3 && n !== 3) s3ClosePopups();
  if (currentScreen === 4 && n !== 4) s4ClosePopups();
  if (currentScreen === 0 && n !== 0) { const v = document.getElementById('s0-char-video'); if (v) v.pause(); }
  const prev = document.querySelector('.screen.active');
  if (window.Motion) Motion.cancel(prev);
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active');
  });
  const target = document.querySelector('.screen[data-screen="' + n + '"]');
  if (!target) return;
  if (typeof wakeMedia === 'function') wakeMedia(target);   /* lazy media (../unit-js/05-media.js): before resetScreenState, which may play() */
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
  dndGhEnter(n);
  if (window.Motion) Motion.reveal(target);
  if (viaBack && n === 1 && s1Done) s1ReopenPopup();
  if (viaBack && n === 2 && s2Done) s2ReopenPopup();
  if (viaBack && n === 3 && s3Done) s3ReopenPopup();
  if (viaBack && n === 4 && s4Done) s4ReopenPopup();
  /* 720 platform layer (guide §6.7 / §8.3 / §8.4a): repaint an answered screen on EVERY navigation,
     open/close the catalogue item, arm the debounced state save. All typeof-guarded and swallowed —
     a reporting failure can never stop the learner. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}
}

/* animation-system: קריאה נוספת חד-פעמית למסך הראשוני בטעינת העמוד (goTo לא רץ על המסך שכבר active-מלכתחילה) */
if (window.Motion) Motion.reveal(document.querySelector('.screen.active'));

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
}

/* ---------- Dev postMessage bridge (index_dev.html free nav) ---------- */
window.addEventListener('message', function (e) {
  if (e.data && e.data.type === 'DEV_GOTO') goTo(e.data.screen);
});
window.addEventListener('load', function () {
  if (window.parent === window) return; // not embedded in index_dev.html
  const screenCount = document.querySelectorAll('.screen').length;
  window.parent.postMessage({ type: 'DEV_READY', total: screenCount }, '*');
});

function advanceScreen() {
  if (currentScreen === 1 && !s1Done) return; // מסך 2: ההמשך נפתח רק אחרי שהשאלה נפתרה (resolved, לא correctness)
  if (currentScreen === 3 && !s3Done) return; // מסך 4: כנ"ל
  if (currentScreen === 4 && !s4Done) return; // מסך 5: כנ"ל
  if (currentScreen === 2 && !s2Done) return; // מסך 3: כנ"ל
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') { s1CloseHint(); s2CloseHint(); s3CloseHint(); s4CloseHint(); }
});

/* resetScreenState0() — מסך 1 (TransitionScreen, שקף 64): סטטי, אין state לסנכרן
   (מנגן את הדמות; יציאה באמצע → חזרה ממשיכה מאותה נקודה). */
function playS0Video() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
function resetScreenState0() { playS0Video(); }
playS0Video(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

function getAppScale() {
  const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

/* =========================================================
   Progress Question (720-templates → _global-components.md → "Progress Question"): 4 שאלות בסדרה "מתקדם";
   פריט ההתקדמות הוא שאלה, לא מסך. מסך 2 = שאלה 1, מסך 3 = שאלה 2. מסך 4 = שאלה 3. מסך 5 = שאלה 4.
   ========================================================= */
const practiceProgress = {
  questions: [
    { number: 1, screens: [1] },
    { number: 2, screens: [2] },
    { number: 3, screens: [3] },
    { number: 4, screens: [4] }
  ]
};
function progressItemResult(q) {
  if (q.result) return q.result();
  if (q.number === 1 && s1Done) return s1Outcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 2 && s2Done) return s2Outcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 3 && s3Done) return s3Outcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 4 && s4Done) return s4Outcome === 'correct' ? 'correct' : 'incorrect';
  return null;
}
function progressItemState(q) {
  const result = progressItemResult(q);
  if (result) return result;
  return q.screens.includes(currentScreen) ? 'current' : 'not-answered';
}
function updateProgressQuestion(container, state) {
  state.questions.forEach(function (q, i) {
    const item = container.querySelector('[data-question="' + (i + 1) + '"]');
    if (!item) return;
    const icon = item.querySelector('.progress-question__icon');
    const label = item.querySelector('.progress-question__label');
    icon.classList.remove('progress-question__icon--current', 'progress-question__icon--correct', 'progress-question__icon--incorrect');
    const qState = progressItemState(q);
    const visited = qState !== 'not-answered';
    if (visited) icon.classList.add('progress-question__icon--' + qState);
    label.classList.toggle('progress-question__label--visited', visited);
  });
  for (let n = 1; n < state.questions.length; n++) {
    const conn = container.querySelector('[data-connector="' + n + '"]');
    if (!conn) continue;
    const st = progressItemState(state.questions[n - 1]);
    conn.classList.toggle('progress-question__connector--visited', st === 'correct' || st === 'incorrect');
  }
}
function syncPracticeProgressNav(sectionEl) {
  const nav = sectionEl && sectionEl.querySelector('.progress-question');
  if (nav) updateProgressQuestion(nav, practiceProgress);
}


/* Pointer-based drag-and-drop (עכבר + מגע) — מנגנון אחד מהלחיצה ועד השחרור (pointerdown/move/up/cancel);
   מופע-הרפאים משובט ל-body ומוקטן כמו #app; תנועה קטנה מ-6px = הקשה (onTap). זהה למנגנון בסיין 2 (מסכים 4–7). */
function createPointerDnd(opts) {
  const targets = new Map(); // elem → targetId
  let active = null;
  const TAP_PX = 6;

  function attachSource(elem, dragId) {
    if (!elem) return;
    elem.dataset.pdragId = dragId;
    if (elem.dataset.pdragAttached === '1') return;
    elem.dataset.pdragAttached = '1';
    elem.addEventListener('pointerdown', onSourceDown);
  }
  function attachTarget(elem, targetId) { if (elem) targets.set(elem, targetId); }

  function onSourceDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const src = e.currentTarget;
    const dragId = src.dataset.pdragId;
    if (!dragId || active) return;
    if (opts.canDrag && !opts.canDrag(dragId, src)) return;
    e.preventDefault();
    const rect = src.getBoundingClientRect();
    const scale = getAppScale();
    active = {
      dragId, srcElem: src, ghost: null, rect, scale,
      pointerId: e.pointerId, pointerType: e.pointerType,
      startX: e.clientX, startY: e.clientY,
      offX: e.clientX - rect.left, offY: e.clientY - rect.top,
      moved: false, currentTarget: null
    };
    document.addEventListener('pointermove', onMove, { passive: false });
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  function startGhost() {
    const a = active;
    const ghost = a.srcElem.cloneNode(true);
    ghost.removeAttribute('id');
    ghost.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    ghost.removeAttribute('tabindex');
    ghost.style.position = 'fixed';
    ghost.style.left = a.rect.left + 'px';
    ghost.style.top = a.rect.top + 'px';
    ghost.style.width = (a.rect.width / a.scale) + 'px';
    ghost.style.height = (a.rect.height / a.scale) + 'px';
    ghost.style.margin = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.transform = 'scale(' + a.scale + ')';
    ghost.style.transformOrigin = 'top left';
    ghost.classList.remove('dragging', 'is-selected', 'is-correct', 'is-wrong');
    ghost.classList.add('pointer-drag-ghost');
    document.body.appendChild(ghost);
    a.ghost = ghost;
    if (opts.onPick) opts.onPick(a.dragId, a.srcElem);
    a.srcElem.classList.add('dragging');
  }

  function targetUnder(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    for (const entry of targets) {
      if (entry[0] === el || entry[0].contains(el)) return { elem: entry[0], id: entry[1] };
    }
    return null;
  }

  function onMove(e) {
    if (!active || e.pointerId !== active.pointerId) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { onUp(e); return; }
    const a = active;
    if (!a.moved) {
      if (Math.abs(e.clientX - a.startX) < TAP_PX && Math.abs(e.clientY - a.startY) < TAP_PX) return;
      a.moved = true;
      startGhost();
    }
    e.preventDefault();
    a.lastX = e.clientX; a.lastY = e.clientY;
    a.ghost.style.left = (e.clientX - a.offX) + 'px';
    a.ghost.style.top = (e.clientY - a.offY) + 'px';
    updateHover();
    if (opts.scrollEl && !a.raf) a.raf = requestAnimationFrame(autoScroll);
  }

  function updateHover() {
    const a = active;
    if (!a || a.lastX === undefined) return;
    const hit = targetUnder(a.lastX, a.lastY);
    const hitId = hit ? hit.id : null;
    if (a.currentTarget !== hitId) {
      targets.forEach(function (tid, elem) { elem.classList.toggle('drag-over', tid === hitId); });
      a.currentTarget = hitId;
    }
  }

  /* גלילה אוטומטית של מכל התוכן כשהמשפט הנגרר קרוב לקצה העליון/התחתון שלו (opts.scrollEl) */
  function autoScroll() {
    const a = active;
    if (!a) return;
    a.raf = 0;
    const el = opts.scrollEl;
    const r = el.getBoundingClientRect();
    const EDGE = 56 * a.scale, MAX = 14;
    let dy = 0;
    if (a.lastY < r.top + EDGE) dy = -MAX * Math.min(1, (r.top + EDGE - a.lastY) / EDGE);
    else if (a.lastY > r.bottom - EDGE) dy = MAX * Math.min(1, (a.lastY - (r.bottom - EDGE)) / EDGE);
    if (dy) {
      const before = el.scrollTop;
      el.scrollTop += dy;
      if (el.scrollTop !== before) updateHover();
      a.raf = requestAnimationFrame(autoScroll);
    }
  }

  function onUp(e) {
    if (!active || (e && e.pointerId !== undefined && e.pointerId !== active.pointerId)) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    const a = active;
    active = null;
    if (a.raf) cancelAnimationFrame(a.raf);
    targets.forEach(function (tid, elem) { elem.classList.remove('drag-over'); });
    a.srcElem.classList.remove('dragging');
    if (a.ghost) a.ghost.remove();
    const cancelled = e && e.type === 'pointercancel';
    if (!a.moved) { if (!cancelled && opts.onTap) opts.onTap(a.dragId); return; }
    if (a.currentTarget && !cancelled && opts.onDrop) opts.onDrop(a.dragId, a.currentTarget);
    else if (opts.onCancel) opts.onCancel(a.dragId);
  }

  return { attachSource: attachSource, attachTarget: attachTarget };
}


/* =========================================================
   מסך 2 (#s1) — OrderedDragAndDropQuestion / DragAndDropQuestion טקסטואלית (שקף 65). שאלה 1 מתוך 4 (סדרה "מתקדם").
   בניית טיעון מדעי: גוררים משפט לכל אחד משלושת רכיבי הטיעון (טענה / ראיה / נימוק); 7 משפטים, 4 מהם מסיחים.
   מפתח (לפי הפתרון בתסריט): טענה = "התכשיט אינו עשוי מזהב טהור." · ראיה = "התכשיט דחק נפח מים גדול יותר מאשר מטיל הזהב בעל המסה הזהה." ·
   נימוק = "כאשר המסות שוות, והנפח גדול יותר, צפיפות החומר נמוכה מצפיפות הזהב."
   • כל משפט יכול להיגרר לכל איזור; איזור מחזיק משפט אחד (משפט שנגרר לאיזור תפוס מפנה את הדייר חזרה לרשימה).
   • בדיקה נפתחת כשכל שלושת האיזורים מלאים. 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • פתרון חלקי: חלק מהאיזורים נכון → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   • Retry gate: אחרי שגוי לא-סופי "צדקתי?" כבוי עד שההנחה שונה בפועל מההנחה השגויה האחרונה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על משפט בוחרת אותו, הקשה/Enter על איזור מניחה, הקשה על הרשימה מחזירה.
   • גלילה: אזור התוכן גולל אנכית (הערת מפיקה); בגרירה — גלילה אוטומטית בקצוות.
   ========================================================= */
const S1 = {
  order: ['d2', 'reasoning', 'd4', 'claim', 'd1', 'evidence', 'd3'],
  zones: ['claim', 'evidence', 'reasoning'],
  correct: { claim: 'claim', evidence: 'evidence', reasoning: 'reasoning' },   // איזור → משפט
  zoneName: { claim: 'ادّعاء', evidence: 'دليل', reasoning: 'التبرير' },
  maxAttempts: 2
};
const S1_EXPLAIN = ['الدليل هو أن القطعة أزاحت حجم ماء أكبر من سبيكة الذهب ذات الكتلة نفسها. من هنا يتبين أن حجمها أكبر، وبالتالي فإن كثافتها أقل من كثافة الذهب. لذلك فإن الاستنتاج هو أن القطعة ليست مصنوعة من ذهب خالص.'];
const S1_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز.', body: S1_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S1_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const s1Placement = {};       // wordId → 'source' | 't1' | 't2'
S1.order.forEach(function (id) { s1Placement[id] = 'source'; });
let s1Marks = {};             // wordId → 'correct' | 'wrong' (אחרי בדיקה)
let s1Selected = null;        // מילה שנבחרה בהקשה/מקלדת
let s1Attempts = 0;
let s1Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s1Outcome = null;         // 'correct' | 'wrong2'
let s1LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s1Partial = false;        // חלל אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s1Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s1View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s1Dnd = null;

function s1Occupant(zone, except) {
  return S1.order.find(function (id) { return id !== except && s1Placement[id] === zone; }) || null;
}
function s1Snapshot() { return JSON.stringify(S1.zones.map(function (z) { return s1Occupant(z, null); })); }
function s1AllFilled() { return S1.zones.every(function (z) { return s1Occupant(z, null) !== null; }); }
function s1Say(msg) { const el = document.getElementById('s1-live'); if (el) el.textContent = msg; }
function s1WordLabel(id) { return document.querySelector('#s1-d-' + id + ' .s1-card__text').textContent; }
function s1IsRight(z) { return s1Occupant(z, null) === S1.correct[z]; }
/* הנחת מילה בחלל; אם החלל תפוס — הדייר מוחזר למחסן */
function s1Place(id, zone) {
  const occ = s1Occupant(zone, id);
  if (occ) s1Placement[occ] = 'source';
  s1Placement[id] = zone;
  s1Say(s1WordLabel(id) + ' وُضِعَت في' + S1.zoneName[zone]);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s1DismissRetry() {
  if (s1Done) return;
  s1Marks = {};
  document.getElementById('s1q-popup')?.classList.add('hidden');
}

function s1Render() {
  S1.order.forEach(function (id) {
    const src = document.getElementById('s1-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s1Placement[id] !== 'source');
    src.classList.toggle('is-locked', s1Done);
    const sel = s1Selected === id;
    src.classList.toggle('is-selected', sel && s1Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s1Done ? 'true' : 'false');
    src.setAttribute('tabindex', s1Placement[id] === 'source' ? '0' : '-1');
  });
  S1.zones.forEach(function (z) {
    const zone = document.getElementById('s1-zone-' + z);
    zone.querySelectorAll('.s1-card').forEach(function (c) { c.remove(); });
    const id = s1Occupant(z, null);
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s1Done);
    zone.classList.remove('is-correct', 'is-wrong');
    if (!id) return;
    const chip = document.createElement('div');
    chip.className = 's1-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
    icon.className = 's1-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 's1-card__text';
    text.textContent = s1WordLabel(id);
    chip.appendChild(icon);
    chip.appendChild(text);
    chip.classList.toggle('is-selected', s1Selected === id);
    chip.classList.toggle('is-locked', s1Done);
    chip.setAttribute('aria-pressed', s1Selected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', s1WordLabel(id) + ' — ب' + S1.zoneName[z] +
      (s1Marks[id] === 'correct' ? '، صحيح' : s1Marks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (s1Marks[id]) {
      const cls = s1Marks[id] === 'correct' ? 'is-correct' : 'is-wrong';
      chip.classList.add(cls);
      zone.classList.add(cls);
    }
    zone.appendChild(chip);
    if (!s1Done && s1Dnd) s1Dnd.attachSource(chip, id);
    chip.addEventListener('keydown', s1CardKey);
  });
  s1UpdateCheck();
  s1UpdateScrollCue();
}

/* רמז גלילה: גלוי כל עוד יש תוכן מתחת לקפל (משפטים שעוד לא נראים) */
function s1UpdateScrollCue() {
  const sc = document.getElementById('s1-scroll');
  const cue = document.getElementById('s1-scroll-cue');
  if (!sc || !cue) return;
  cue.classList.toggle('is-hidden', sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 8);
}
document.getElementById('s1-scroll')?.addEventListener('scroll', s1UpdateScrollCue, { passive: true });
window.addEventListener('resize', s1UpdateScrollCue);
/* resetScreenState1 רץ לפני שהמסך הופך ל-active (מידות 0) — מודדים מחדש כשהתוכן מקבל מידות אמיתיות / משתנה */
if (window.ResizeObserver) {
  const s1Ro = new ResizeObserver(s1UpdateScrollCue);
  document.querySelectorAll('#s1-scroll, #s1-scroll .s1-inner').forEach(function (el) { s1Ro.observe(el); });
}

function s1UpdateCheck() {
  if (s1Done) return;
  const btn = document.getElementById('s1q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s1AllFilled() || (s1LastWrong !== null && s1Snapshot() === s1LastWrong);
}

function s1InitDnd() {
  if (s1Dnd) return;
  s1Dnd = createPointerDnd({
    scrollEl: document.getElementById('s1-scroll'),
    canDrag: function () { return !s1Done; },
    onPick: function (id) {
      dndGhStop('s1', true);
      s1DismissRetry();
      s1Selected = null;
      if (s1Placement[id] !== 'source') s1Placement[id] = 'source';
      s1Render();
      document.getElementById('s1-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s1Place(id, zone); s1Render(); },
    onCancel: function () { s1Render(); },
    onTap: function (id) { s1Tap(id); }
  });
  S1.order.forEach(function (id) {
    const el = document.getElementById('s1-d-' + id);
    s1Dnd.attachSource(el, id);
    el.addEventListener('keydown', s1CardKey);
  });
  S1.zones.forEach(function (z) { s1Dnd.attachTarget(document.getElementById('s1-zone-' + z), z); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על חלל */
function s1Tap(id) {
  dndGhStop('s1', true);
  if (s1Done) return;
  s1DismissRetry();
  /* יש מילה נבחרת והלומד הקיש על מילה שכבר מונחת בחלל → זו הנחה באותו חלל */
  if (s1Selected && s1Selected !== id && s1Placement[id] !== 'source') {
    const moved = s1Selected;
    s1Selected = null;
    s1Place(moved, s1Placement[id]);
    s1Render();
    return;
  }
  s1Selected = (s1Selected === id) ? null : id;
  s1Say(s1Selected ? s1WordLabel(id) + ' تم الاختيار. اختاروا منطقة للوضع.' : '');
  s1Render();
}
function s1CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) s1Tap(id);
}
function s1ZoneClick(z, e) {
  dndGhStop('s1', true);
  if (e && e.target.closest && e.target.closest('.s1-card')) return; // הקשה על מילה מטופלת ב-s1Tap
  if (s1Done || !s1Selected) return;
  s1DismissRetry();
  const id = s1Selected;
  s1Selected = null;
  s1Place(id, z);
  s1Render();
}
function s1ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s1ZoneClick(z);
}
function s1TrayClick(e) {
  if (s1Done || !s1Selected || (e.target.closest && e.target.closest('.s1-card'))) return;
  if (s1Placement[s1Selected] === 'source') return;
  s1DismissRetry();
  s1Placement[s1Selected] = 'source';
  s1Say(s1WordLabel(s1Selected) + ' تمت إعادته إلى القائمة');
  s1Selected = null;
  s1Render();
}

function s1MarkByZone() {
  s1Marks = {};
  S1.zones.forEach(function (z) {
    const id = s1Occupant(z, null);
    if (id) s1Marks[id] = s1IsRight(z) ? 'correct' : 'wrong';
  });
}

function s1Check() {
  if (s1Done) { advanceScreen(); return; }
  if (!s1AllFilled()) return;
  s1Selected = null;
  s1Attempts++;
  const okCount = S1.zones.filter(s1IsRight).length;
  const ok = okCount === S1.zones.length;
  /* xAPI: matching — the sentence in each zone; target index per the catalogue (0 טענה, 1 ראיה, 2 נימוק). */
  xapiAnswered('001', 'q1', ok, ok || s1Attempts >= S1.maxAttempts, { pairs: S1.zones.map(function (z) { var id = s1Occupant(z, null); return id ? { source: s1WordLabel(id), target: ({ claim: 0, evidence: 1, reasoning: 2 })[z] } : null; }).filter(Boolean) });
  s1Partial = okCount > 0 && !ok;
  if (ok) {
    s1Done = true;
    s1Outcome = 'correct';
    s1MarkByZone();
    s1Render();
    s1ShowPopup('correct');
    s1Finish();
  } else if (s1Attempts >= S1.maxAttempts) {
    s1Done = true;
    s1Outcome = 'wrong2';
    s1Answer = Object.assign({}, s1Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s1View = 'solution';
    s1ApplyView();
    s1Finish();
  } else {
    s1LastWrong = s1Snapshot();
    s1MarkByZone(); // חיווי per-חלל גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
    s1Render();
    s1ShowPopup('retry');
    const btn = document.getElementById('s1q-check');
    if (btn) btn.disabled = true; // Retry gate
    s1Say((s1Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s1Finish() {
  const btn = document.getElementById('s1q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s1q-hint')?.classList.add('s3q-hint-done');
  s1CloseHint();
  syncPracticeProgressNav(document.getElementById('s1'));
}

function s1ShowSolution() {
  S1.order.forEach(function (id) { s1Placement[id] = 'source'; });
  S1.zones.forEach(function (z) { s1Placement[S1.correct[z]] = z; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s1ApplyView() {
  if (s1Answer === null) return;
  if (s1View === 'answer') Object.assign(s1Placement, s1Answer);
  else s1ShowSolution();
  s1MarkByZone();
  s1Render();
  s1ShowPopup('wrong2', s1View);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
}
function s1ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s1Answer === null) return;
  s1View = (s1View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s1ApplyView();
}

function s1ShowPopup(type, view) {
  const cfg = S1_FEEDBACK[type];
  const popup = document.getElementById('s1q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": רק הכותרת והכפתור מתחלפים — גוף המשוב המלא נשאר
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהחללים (לא כולם) → "התשובה נכונה חלקית." במקום "אינה נכונה" גורף */
  if (s1Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s1Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (s1Partial && type === 'wrong2' && view === 'answer') title = 'الإجابة صحيحة جزئيًا.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s1q-popup-title').innerHTML = title;
  document.getElementById('s1q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s1q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s1ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
/* ערבוב סדר המשפטים ברשימה — פעם אחת בטעינת העמוד (הסדר נשמר לאורך הביקור במסך) */
(function s1Shuffle() {
  ['s1-tray'].forEach(function (id) {
    const tray = document.getElementById(id);
    if (!tray) return;
    const slots = Array.prototype.slice.call(tray.children);
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = slots[i]; slots[i] = slots[j]; slots[j] = t;
    }
    slots.forEach(function (s) { tray.appendChild(s); });
  });
})();

/* גודל איזור הגרירה = גודל המשפט הגדול ביותר (רוחב וגובה), נמדד כשהמסך מוצג */
function s1Fit() {
  const sec = document.getElementById('s1');
  if (!sec) return;
  let w = 0, h = 0;
  sec.querySelectorAll('.s1-slot > .s1-card').forEach(function (c) {
    /* משפט שהונח באיזור מוסתר מהרשימה (offsetWidth = 0) — משתמשים בגודל שנמדד כשהיה גלוי */
    if (c.offsetWidth) { c.dataset.fitW = c.offsetWidth; c.dataset.fitH = c.offsetHeight; }
    w = Math.max(w, +c.dataset.fitW || 0);
    h = Math.max(h, +c.dataset.fitH || 0);
  });
  if (!w) return; // המסך מוסתר — יימדד בכניסה
  sec.style.setProperty('--s1-w', w + 'px');
  sec.style.setProperty('--s1-h', h + 'px');
}
window.addEventListener('resize', s1Fit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(s1Fit); });

function resetScreenState1() {
  requestAnimationFrame(function () { requestAnimationFrame(function () { s1Fit(); s1UpdateScrollCue(); }); }); // אחרי שהמסך הופך ל-active
  syncPracticeProgressNav(document.getElementById('s1'));
  s1InitDnd();
  document.getElementById('s1q-popup')?.classList.add('hidden');
  s1CloseHint();
  s1Selected = null;
  if (s1Done) {
    if (s1Outcome === 'wrong2') { s1View = 'solution'; s1ShowSolution(); }
    s1MarkByZone();
    s1Render();
    const btn = document.getElementById('s1q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s1q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s1Render();
}
function s1ReopenPopup() {
  if (s1Outcome === 'wrong2') { s1View = 'solution'; s1ApplyView(); }
  else if (s1Outcome) s1ShowPopup(s1Outcome);
}
function s1ClosePopups() {
  document.getElementById('s1q-popup')?.classList.add('hidden');
  s1CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s1OpenHint() {
  if (s1Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q1');
  document.getElementById('s1q-hint-overlay')?.classList.remove('hidden');
}
function s1CloseHint() { document.getElementById('s1q-hint-overlay')?.classList.add('hidden'); }
function s1CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s1CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s1PopupDrag = null;
function s1PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s1q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s1PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s1PopupMove, { passive: false });
  document.addEventListener('pointerup', s1PopupUp);
  document.addEventListener('pointercancel', s1PopupUp);
  e.preventDefault();
}
function s1PopupMove(e) {
  if (!s1PopupDrag || e.pointerId !== s1PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s1PopupUp(e); return; }
  const popup = document.getElementById('s1q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s1PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s1PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s1PopupUp(e) {
  if (s1PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s1PopupDrag.id) return;
  s1PopupDrag = null;
  document.removeEventListener('pointermove', s1PopupMove);
  document.removeEventListener('pointerup', s1PopupUp);
  document.removeEventListener('pointercancel', s1PopupUp);
}


/* =========================================================
   מסך 3 (#s2) — ImageTopDragAndDropQuestion (שקף 66) — DragAndDropQuestion, וריאנט מקומי (אזורים מרובי-פריטים). שאלה 2 מתוך 4.
   מפתח לפי הערת המפיקה: יצוף על פני השמן — פקק שעם, פוליפרופילן; ישקע לתחתית הכלי — אלומיניום.
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • בדיקה נפתחת כששלושת הכרטיסים הונחו; Retry gate אחרי שגוי לא-סופי: "צדקתי?" כבוי עד שההנחה שונה בפועל מהשגויה האחרונה.
   • פתרון חלקי: חלק מהכרטיסים נכון → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על אזור מניחה, הקשה על המגש מחזירה כרטיס מונח.
   ========================================================= */
const S2 = {
  order: ['cork', 'al', 'poly'],
  correct: { cork: 'float', poly: 'float', al: 'sink' },
  zoneName: { float: 'يطفو على سطح الزيت', sink: 'سيغوص إلى قاع الوعاء' },
  maxAttempts: 2
};
const S2_EXPLAIN = [
  'سدادة الفلين والبولي بروبيلين سيطفوان على سطح الزيت، لأن كثافتهما أقل من كثافة زيت الزيتون.',
  'الألومنيوم سيغوص، لأن كثافته أعلى من كثافة الزيت.'
];
const S2_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا‎!', body: S2_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const s2Placement = {};       // cardId → 'source' | 'float' | 'sink'
S2.order.forEach(function (id) { s2Placement[id] = 'source'; });
let s2Marks = {};             // cardId → 'correct' | 'wrong' (אחרי בדיקה)
let s2Selected = null;        // כרטיס שנבחר בהקשה/מקלדת
let s2Attempts = 0;
let s2Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s2Outcome = null;         // 'correct' | 'wrong2'
let s2LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s2Partial = false;        // לפחות כרטיס אחד במקום הנכון אך לא כולם → "התשובה נכונה חלקית."
let s2Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s2View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s2Dnd = null;

function s2Snapshot() { return JSON.stringify(S2.order.map(function (id) { return s2Placement[id]; })); }
function s2AllPlaced() { return S2.order.every(function (id) { return s2Placement[id] !== 'source'; }); }
function s2Say(msg) { const el = document.getElementById('s2-live'); if (el) el.textContent = msg; }
function s2CardLabel(id) { return document.querySelector('#s2-d-' + id + ' .s2-card__name').textContent; }
function s2IsRight(id) { return s2Placement[id] === S2.correct[id]; }
function s2MarkAll() {
  s2Marks = {};
  S2.order.forEach(function (id) { s2Marks[id] = s2IsRight(id) ? 'correct' : 'wrong'; });
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s2DismissRetry() {
  if (s2Done) return;
  s2Marks = {};
  document.getElementById('s2q-popup')?.classList.add('hidden');
}

function s2Render() {
  S2.order.forEach(function (id) {
    const src = document.getElementById('s2-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s2Placement[id] !== 'source');
    src.classList.toggle('is-locked', s2Done);
    const sel = s2Selected === id;
    src.classList.toggle('is-selected', sel && s2Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s2Done ? 'true' : 'false');
    src.setAttribute('tabindex', s2Placement[id] === 'source' ? '0' : '-1');
  });
  ['float', 'sink'].forEach(function (z) {
    const zone = document.getElementById('s2-zone-' + z);
    zone.querySelectorAll('.s2-card').forEach(function (c) { c.remove(); });
    let n = 0;
    S2.order.forEach(function (id) {
      if (s2Placement[id] !== z) return;
      n++;
      const srcEl = document.getElementById('s2-d-' + id);
      const chip = srcEl.cloneNode(true);                    /* אותו כרטיס בדיוק כמו במגש: שם + תמונה, בלי שינוי גודל/מראה */
      chip.removeAttribute('id');
      chip.className = 's2-card is-placed';
      chip.dataset.id = id;
      chip.removeAttribute('data-pdrag-id');
      chip.removeAttribute('data-pdrag-attached');
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      const icon = document.createElement('span');          /* עיגול נכון/שגוי צף בפינה — לא משנה את גיאומטריית הכרטיס */
      icon.className = 's2-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      chip.appendChild(icon);
      chip.classList.toggle('is-selected', s2Selected === id);
      chip.classList.toggle('is-locked', s2Done);
      chip.setAttribute('aria-pressed', s2Selected === id ? 'true' : 'false');
      chip.setAttribute('aria-label', s2CardLabel(id) + ' — ب' + S2.zoneName[z] +
        (s2Marks[id] === 'correct' ? '، صحيح' : s2Marks[id] === 'wrong' ? '، غير صحيح' : ''));
      if (s2Marks[id]) chip.classList.add(s2Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
      zone.appendChild(chip);
      if (!s2Done && s2Dnd) s2Dnd.attachSource(chip, id);
      chip.addEventListener('keydown', s2CardKey);
    });
    zone.classList.toggle('occupied', n > 0);
    zone.classList.toggle('is-locked', s2Done);
  });
  s2UpdateCheck();
}

function s2UpdateCheck() {
  if (s2Done) return;
  const btn = document.getElementById('s2q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s2AllPlaced() || (s2LastWrong !== null && s2Snapshot() === s2LastWrong);
}

function s2InitDnd() {
  if (s2Dnd) return;
  s2Dnd = createPointerDnd({
    canDrag: function () { return !s2Done; },
    onPick: function (id) {
      dndGhStop('s2', true);
      s2DismissRetry();
      s2Selected = null;
      if (s2Placement[id] !== 'source') s2Placement[id] = 'source';
      s2Render();
      document.getElementById('s2-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) {
      s2Placement[id] = zone;
      s2Say(s2CardLabel(id) + ' وُضِع في' + S2.zoneName[zone]);
      s2Render();
    },
    onCancel: function () { s2Render(); },
    onTap: function (id) { s2Tap(id); }
  });
  S2.order.forEach(function (id) {
    const el = document.getElementById('s2-d-' + id);
    s2Dnd.attachSource(el, id);
    el.addEventListener('keydown', s2CardKey);
  });
  document.querySelectorAll('#s2 .s2-zone').forEach(function (z) { s2Dnd.attachTarget(z, z.dataset.zone); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על אזור */
function s2Tap(id) {
  dndGhStop('s2', true);
  if (s2Done) return;
  s2DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על כרטיס שכבר מונח באזור → זו הנחה באותו אזור */
  if (s2Selected && s2Selected !== id && s2Placement[id] !== 'source') {
    const moved = s2Selected;
    s2Selected = null;
    s2Placement[moved] = s2Placement[id];
    s2Say(s2CardLabel(moved) + ' وُضِع في' + S2.zoneName[s2Placement[moved]]);
    s2Render();
    return;
  }
  s2Selected = (s2Selected === id) ? null : id;
  s2Say(s2Selected ? s2CardLabel(id) + ' تم الاختيار. اختاروا منطقة: سيطفو على سطح الزيت أو سيغوص إلى قاع الوعاء.' : '');
  s2Render();
}
function s2CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) s2Tap(id);
}
function s2ZoneClick(z, e) {
  dndGhStop('s2', true);
  if (e && e.target.closest && e.target.closest('.s2-card')) return; // הקשה על כרטיס מטופלת ב-s2Tap
  if (s2Done || !s2Selected) return;
  s2DismissRetry();
  const id = s2Selected;
  s2Selected = null;
  s2Placement[id] = z;
  s2Say(s2CardLabel(id) + ' وُضِع في' + S2.zoneName[z]);
  s2Render();
}
function s2ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s2ZoneClick(z);
}
function s2TrayClick(e) {
  if (s2Done || !s2Selected || (e.target.closest && e.target.closest('.s2-card'))) return;
  if (s2Placement[s2Selected] === 'source') return;
  s2DismissRetry();
  s2Placement[s2Selected] = 'source';
  s2Say(s2CardLabel(s2Selected) + ' تمت إعادته إلى الصينية');
  s2Selected = null;
  s2Render();
}

function s2Check() {
  if (s2Done) { advanceScreen(); return; }
  if (!s2AllPlaced()) return;
  s2Selected = null;
  s2Attempts++;
  const okCount = S2.order.filter(s2IsRight).length;
  const ok = okCount === S2.order.length;
  /* xAPI: matching — placed cards only; target index per the catalogue (0 יצוף על פני השמן, 1 ישקע לתחתית הכלי). */
  xapiAnswered('002', 'q1', ok, ok || s2Attempts >= S2.maxAttempts, { pairs: S2.order.filter(function (id) { return s2Placement[id] !== 'source'; }).map(function (id) { return { source: s2CardLabel(id), target: s2Placement[id] === 'float' ? 0 : 1 }; }) });
  s2Partial = okCount > 0 && !ok;
  if (ok) {
    s2Done = true;
    s2Outcome = 'correct';
    s2MarkAll();
    s2Render();
    s2ShowPopup('correct');
    s2Finish();
  } else if (s2Attempts >= S2.maxAttempts) {
    s2Done = true;
    s2Outcome = 'wrong2';
    s2Answer = Object.assign({}, s2Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s2View = 'solution';
    s2ApplyView();
    s2Finish();
  } else {
    s2LastWrong = s2Snapshot();
    s2MarkAll(); // חיווי per-כרטיס גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
    s2Render();
    s2ShowPopup('retry');
    const btn = document.getElementById('s2q-check');
    if (btn) btn.disabled = true; // Retry gate
    s2Say((s2Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s2Finish() {
  const btn = document.getElementById('s2q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s2q-hint')?.classList.add('s3q-hint-done');
  s2CloseHint();
  syncPracticeProgressNav(document.getElementById('s2'));
}

function s2ShowSolution() { Object.assign(s2Placement, S2.correct); }

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s2ApplyView() {
  if (s2Answer === null) return;
  if (s2View === 'answer') Object.assign(s2Placement, s2Answer);
  else s2ShowSolution();
  s2MarkAll();
  s2Render();
  s2ShowPopup('wrong2', s2View);
}
function s2ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s2Answer === null) return;
  s2View = (s2View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s2ApplyView();
}

function s2ShowPopup(type, view) {
  const cfg = S2_FEEDBACK[type];
  const popup = document.getElementById('s2q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": רק הכותרת והכפתור מתחלפים — גוף המשוב המלא נשאר
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהכרטיסים (לא כולם) → "התשובה נכונה חלקית." במקום "לא נכונה" גורף */
  if (s2Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s2Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (s2Partial && type === 'wrong2' && view === 'answer') title = 'الإجابة صحيحة جزئيًا.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; popup.style.right = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s2q-popup-title').innerHTML = title;
  document.getElementById('s2q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s2q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s2ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState2() {
  syncPracticeProgressNav(document.getElementById('s2'));
  s2InitDnd();
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2CloseHint();
  s2Selected = null;
  if (s2Done) {
    if (s2Outcome === 'wrong2') { s2View = 'solution'; s2ShowSolution(); }
    s2MarkAll();
    s2Render();
    const btn = document.getElementById('s2q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s2q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s2Render();
}
function s2ReopenPopup() {
  if (s2Outcome === 'wrong2') { s2View = 'solution'; s2ApplyView(); }
  else if (s2Outcome) s2ShowPopup(s2Outcome);
}
function s2ClosePopups() {
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s2OpenHint() {
  if (s2Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('002', 'q1');
  document.getElementById('s2q-hint-overlay')?.classList.remove('hidden');
}
function s2CloseHint() { document.getElementById('s2q-hint-overlay')?.classList.add('hidden'); }
function s2CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s2CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s2PopupDrag = null;
function s2PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  popup.style.right = 'auto'; // המשוב מעוגן בימין; בגרירה עוברים לעיגון שמאלי
  s2PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s2PopupMove, { passive: false });
  document.addEventListener('pointerup', s2PopupUp);
  document.addEventListener('pointercancel', s2PopupUp);
  e.preventDefault();
}
function s2PopupMove(e) {
  if (!s2PopupDrag || e.pointerId !== s2PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s2PopupUp(e); return; }
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s2PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s2PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s2PopupUp(e) {
  if (s2PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s2PopupDrag.id) return;
  s2PopupDrag = null;
  document.removeEventListener('pointermove', s2PopupMove);
  document.removeEventListener('pointerup', s2PopupUp);
  document.removeEventListener('pointercancel', s2PopupUp);
}


/* =========================================================
   מסך 4 (#s3) — MultipleChoiceQuestion, וריאנט תמונה (שקף 67). שאלה 3 מתוך 4.
   בחירה מרובה (Set); נכון = שיר ואמיר (הערת המפיקה). נכונות = שוויון קבוצות.
   • "צדקתי?" נפתח משנבחרה לפחות דמות אחת. 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • שגוי לא-סופי: כל דמות שנבחרה מסומנת ירוק/אדום; נכונות שלא נבחרו נשארות ניטרליות. Retry gate: שוויון Set מול השגוי האחרון.
   • שגוי סופי / נכון: כל הקבוצה הנכונה ירוקה, בחירות שגויות אדומות, הכל ננעל. View My Answer Toggle בשגוי סופי (לפי בקשת המפיקה, בניגוד לברירת המחדל של התבנית).
   • חלקי: לפחות דמות אחת נכונה נבחרה אך הקבוצה אינה שווה → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   ========================================================= */
const S3 = {
  order: ['amir', 'rut', 'shir', 'alon'],
  correct: new Set(['shir', 'amir']),
  maxAttempts: 2
};
const S3_EXPLAIN = [
  'تشرح ريم بشكل صحيح أن الكثافة هي خاصيّة للمادة ولا تعتمد على حجم أو شكل الجسم.',
  'أمير يشرح بشكل صحيح أن الكثافة هي النسبة بين الكتلة والحجم، وهذه القيمة تتيح التعرف على المادة.'
];
const S3_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S3_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي' },
    answerView: { title: 'الإجابة غير صحيحة.', action: { label: 'الحل الصحيح' } }
  }
};

let s3Selected = new Set();
let s3Marks = {};             // id → 'correct' | 'wrong'
let s3Attempts = 0;
let s3Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s3Outcome = null;         // 'correct' | 'wrong2'
let s3LastWrong = null;       // Set שסומן שגוי בניסיון הלא-סופי האחרון (Retry gate)
let s3Partial = false;
let s3View = 'solution';      // 'solution' | 'answer' — runtime בלבד (View My Answer Toggle בשגוי סופי)

function s3SetsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
function s3Say(msg) { const el = document.getElementById('s3-live'); if (el) el.textContent = msg; }
function s3Name(id) { return document.querySelector('#s3-c-' + id + ' .s3-card__name').textContent; }

function s3Render() {
  S3.order.forEach(function (id) {
    const el = document.getElementById('s3-c-' + id);
    const sel = s3Selected.has(id);
    el.classList.toggle('is-selected', sel);
    el.classList.toggle('is-correct', s3Marks[id] === 'correct');
    el.classList.toggle('is-wrong', s3Marks[id] === 'wrong');
    el.classList.toggle('is-locked', s3Done);
    el.setAttribute('aria-checked', sel ? 'true' : 'false');
    el.setAttribute('aria-disabled', s3Done ? 'true' : 'false');
    const mark = s3Marks[id] === 'correct' ? '، صحيح' : s3Marks[id] === 'wrong' ? '، غير صحيح' : '';
    el.setAttribute('aria-label', s3Name(id) + mark);
  });
  s3UpdateCheck();
}
function s3UpdateCheck() {
  if (s3Done) return;
  const btn = document.getElementById('s3q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות Set שונה בפועל מהשגוי האחרון */
  btn.disabled = s3Selected.size < 1 || (s3LastWrong !== null && s3SetsEqual(s3Selected, s3LastWrong));
}

function s3Toggle(id) {
  dndGhStop('s3', true);
  if (s3Done) return;
  if (Object.keys(s3Marks).length) { s3Marks = {}; document.getElementById('s3q-popup')?.classList.add('hidden'); } // ניסיון חדש מתחיל
  if (s3Selected.has(id)) s3Selected.delete(id); else s3Selected.add(id);
  s3Say(s3Name(id) + (s3Selected.has(id) ? ' اختير' : ' تمّ إلغاء الاختيار'));
  s3Render();
}

function s3MarkSubmitted() {            // לא-סופי: רק מה שנבחר
  s3Marks = {};
  s3Selected.forEach(function (id) { s3Marks[id] = S3.correct.has(id) ? 'correct' : 'wrong'; });
}
function s3MarkAnswer() { s3MarkSubmitted(); }   // תצוגת "התשובה שלי": רק מה שהלומד בחר
function s3MarkReveal() {               // סופי / נכון: כל הקבוצה הנכונה + בחירות שגויות
  s3Marks = {};
  S3.order.forEach(function (id) {
    if (S3.correct.has(id)) s3Marks[id] = 'correct';
    else if (s3Selected.has(id)) s3Marks[id] = 'wrong';
  });
}

function s3Check() {
  if (s3Done) { advanceScreen(); return; }
  if (s3Selected.size < 1) return;
  s3Attempts++;
  const ok = s3SetsEqual(s3Selected, S3.correct);
  /* xAPI: multiple choice — the selected option indexes (answers order = S3.order). */
  xapiAnswered('003', 'q1', ok, ok || s3Attempts >= S3.maxAttempts, { choices: Array.from(s3Selected).map(function (id) { return S3.order.indexOf(id); }) });
  s3Partial = !ok && Array.from(s3Selected).some(function (id) { return S3.correct.has(id); });
  if (ok) {
    s3Done = true; s3Outcome = 'correct';
    s3MarkReveal(); s3Render(); s3ShowPopup('correct'); s3Finish();
  } else if (s3Attempts >= S3.maxAttempts) {
    s3Done = true; s3Outcome = 'wrong2';
    s3View = 'solution'; s3MarkReveal(); s3Render(); s3ShowPopup('wrong2', s3View); s3Finish();
  } else {
    s3LastWrong = new Set(s3Selected);
    s3MarkSubmitted(); s3Render(); s3ShowPopup('retry');
    const btn = document.getElementById('s3q-check');
    if (btn) btn.disabled = true; // Retry gate
    s3Say((s3Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s3Finish() {
  const btn = document.getElementById('s3q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s3q-hint')?.classList.add('s3q-hint-done');
  s3CloseHint();
  syncPracticeProgressNav(document.getElementById('s3'));
}

function s3ApplyView() {
  if (s3View === 'answer') s3MarkAnswer(); else s3MarkReveal();
  s3Render();
  s3ShowPopup('wrong2', s3View);
}
function s3ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done
  if (s3Outcome !== 'wrong2') return;
  s3View = (s3View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s3ApplyView();
}

function s3ShowPopup(type, view) {
  const cfg = S3_FEEDBACK[type];
  const popup = document.getElementById('s3q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  const answerView = type === 'wrong2' && view === 'answer';
  if (answerView) { title = cfg.answerView.title; action = cfg.answerView.action; }
  if (s3Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s3Partial && type === 'wrong2') title = answerView ? 'الإجابة صحيحة جزئيًا.' : 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s3q-popup-title').innerHTML = title;
  document.getElementById('s3q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s3q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s3ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: פתור → חוזר נעול עם החשיפה המלאה; באמצע → הבחירה נשמרת, סימוני הניסיון הקודם נמחקים */
function resetScreenState3() {
  syncPracticeProgressNav(document.getElementById('s3'));
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3CloseHint();
  if (s3Done) {
    s3View = 'solution';
    s3MarkReveal();
    s3Render();
    const btn = document.getElementById('s3q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s3q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s3Marks = {};
  s3Render();
}
function s3ReopenPopup() { if (s3Outcome) s3ShowPopup(s3Outcome, 'solution'); }
function s3ClosePopups() {
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3CloseHint();
}

function s3OpenHint() {
  if (s3Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s3q-hint-overlay')?.classList.remove('hidden');
}
function s3CloseHint() { document.getElementById('s3q-hint-overlay')?.classList.add('hidden'); }
function s3CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s3CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s3PopupDrag = null;
function s3PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s3PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s3PopupMove, { passive: false });
  document.addEventListener('pointerup', s3PopupUp);
  document.addEventListener('pointercancel', s3PopupUp);
  e.preventDefault();
}
function s3PopupMove(e) {
  if (!s3PopupDrag || e.pointerId !== s3PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s3PopupUp(e); return; }
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s3PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s3PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s3PopupUp(e) {
  if (s3PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s3PopupDrag.id) return;
  s3PopupDrag = null;
  document.removeEventListener('pointermove', s3PopupMove);
  document.removeEventListener('pointerup', s3PopupUp);
  document.removeEventListener('pointercancel', s3PopupUp);
}


/* =========================================================
   מסך 5 (#s4) — OrderedDragAndDropQuestion (שקף 68). שאלה 4 מתוך 4 (סדרה "מתקדם").
   סידור 6 שלבי תהליך (מדידת נפח בדחיקת מים → חישוב צפיפות → זיהוי חומר) לפי הסדר הנכון: 6 איזורי גרירה ממוספרים (1–6) מימין,
   6 שלבים (בלי מסיחים) משמאל, מעורבבים. הערת מפיקה: "הסדר בו מופיעים המסיחים הוא הסדר הנכון – יש לערבב" (= סדר השקף, מימין לשמאל).
   Figma (720 — UI Templates): 1717:39511 התחלה · 1717:39465 גרירה · 1717:39599 / 1717:39645 אחרי שחרור · 1717:39683 / 1717:39762 חיווי · 1717:39801 משוב.
   • כל שלב יכול להיגרר לכל איזור; איזור מחזיק שלב אחד (שלב שנגרר לאיזור תפוס מפנה את הדייר חזרה לרשימה).
   • בדיקה נפתחת כשכל ששת האיזורים מלאים. 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • פתרון חלקי: חלק מהאיזורים נכון → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   • Retry gate: אחרי שגוי לא-סופי "צדקתי?" כבוי עד שההנחה שונה בפועל מההנחה השגויה האחרונה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על שלב בוחרת אותו, הקשה/Enter על איזור מניחה, הקשה על הרשימה מחזירה.
   • גלילה: אזור התוכן גולל אנכית (הערת מפיקה / Figma 1717:41978); בגרירה — גלילה אוטומטית בקצוות.
   ========================================================= */
const S4 = {
  order: ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
  zones: ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'],
  correct: { z1: 'a1', z2: 'a2', z3: 'a3', z4: 'a4', z5: 'a5', z6: 'a6' },   // איזור → שלב
  zoneName: { z1: 'المكان 1', z2: 'المكان 2', z3: 'المكان 3', z4: 'المكان 4', z5: 'المكان 5', z6: 'المكان 6' },
  maxAttempts: 2
};
const S4_EXPLAIN = [
  'لحساب الكثافة يجب معرفة حجم الجسم أيضًا.',
  'تُقاس عن طريق إزاحة المياه، ويُحسَب الفرق بين مستويي الماء، وتُقسَم الكتلة على الحجم، وتُقارَن النتيجة بجدول الكثافات.'
];
const S4_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S4_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const s4Placement = {};       // stepId → 'source' | zoneId
S4.order.forEach(function (id) { s4Placement[id] = 'source'; });
let s4Marks = {};             // wordId → 'correct' | 'wrong' (אחרי בדיקה)
let s4Selected = null;        // מילה שנבחרה בהקשה/מקלדת
let s4Attempts = 0;
let s4Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s4Outcome = null;         // 'correct' | 'wrong2'
let s4LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s4Partial = false;        // חלל אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s4Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s4View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s4Dnd = null;

function s4Occupant(zone, except) {
  return S4.order.find(function (id) { return id !== except && s4Placement[id] === zone; }) || null;
}
function s4Snapshot() { return JSON.stringify(S4.zones.map(function (z) { return s4Occupant(z, null); })); }
function s4AllFilled() { return S4.zones.every(function (z) { return s4Occupant(z, null) !== null; }); }
function s4Say(msg) { const el = document.getElementById('s4-live'); if (el) el.textContent = msg; }
function s4WordLabel(id) { return document.querySelector('#s4-d-' + id + ' .s4-card__text').textContent; }
function s4IsRight(z) { return s4Occupant(z, null) === S4.correct[z]; }
/* הנחת מילה בחלל; אם החלל תפוס — הדייר מוחזר למחסן */
function s4Place(id, zone) {
  const occ = s4Occupant(zone, id);
  if (occ) s4Placement[occ] = 'source';
  s4Placement[id] = zone;
  s4Say(s4WordLabel(id) + ' وُضِعَت في' + S4.zoneName[zone]);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s4DismissRetry() {
  if (s4Done) return;
  s4Marks = {};
  document.getElementById('s4q-popup')?.classList.add('hidden');
}

function s4Render() {
  S4.order.forEach(function (id) {
    const src = document.getElementById('s4-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s4Placement[id] !== 'source');
    src.classList.toggle('is-locked', s4Done);
    const sel = s4Selected === id;
    src.classList.toggle('is-selected', sel && s4Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s4Done ? 'true' : 'false');
    src.setAttribute('tabindex', s4Placement[id] === 'source' ? '0' : '-1');
  });
  S4.zones.forEach(function (z) {
    const zone = document.getElementById('s4-zone-' + z);
    zone.querySelectorAll('.s4-card').forEach(function (c) { c.remove(); });
    const id = s4Occupant(z, null);
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s4Done);
    zone.classList.remove('is-correct', 'is-wrong');
    if (!id) return;
    const chip = document.createElement('div');
    chip.className = 's4-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
    icon.className = 's4-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 's4-card__text';
    text.textContent = s4WordLabel(id);
    chip.appendChild(icon);
    chip.appendChild(text);
    chip.classList.toggle('is-selected', s4Selected === id);
    chip.classList.toggle('is-locked', s4Done);
    chip.setAttribute('aria-pressed', s4Selected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', s4WordLabel(id) + ' — ب' + S4.zoneName[z] +
      (s4Marks[id] === 'correct' ? '، صحيح' : s4Marks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (s4Marks[id]) {
      const cls = s4Marks[id] === 'correct' ? 'is-correct' : 'is-wrong';
      chip.classList.add(cls);
      zone.classList.add(cls);
    }
    zone.appendChild(chip);
    if (!s4Done && s4Dnd) s4Dnd.attachSource(chip, id);
    chip.addEventListener('keydown', s4CardKey);
  });
  s4UpdateCheck();
}

function s4UpdateCheck() {
  if (s4Done) return;
  const btn = document.getElementById('s4q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s4AllFilled() || (s4LastWrong !== null && s4Snapshot() === s4LastWrong);
}

function s4InitDnd() {
  if (s4Dnd) return;
  s4Dnd = createPointerDnd({
    scrollEl: document.getElementById('s4-scroll'),
    canDrag: function () { return !s4Done; },
    onPick: function (id) {
      dndGhStop('s4', true);
      s4DismissRetry();
      s4Selected = null;
      if (s4Placement[id] !== 'source') s4Placement[id] = 'source';
      s4Render();
      document.getElementById('s4-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s4Place(id, zone); s4Render(); },
    onCancel: function () { s4Render(); },
    onTap: function (id) { s4Tap(id); }
  });
  S4.order.forEach(function (id) {
    const el = document.getElementById('s4-d-' + id);
    s4Dnd.attachSource(el, id);
    el.addEventListener('keydown', s4CardKey);
  });
  S4.zones.forEach(function (z) { s4Dnd.attachTarget(document.getElementById('s4-zone-' + z), z); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על חלל */
function s4Tap(id) {
  dndGhStop('s4', true);
  if (s4Done) return;
  s4DismissRetry();
  /* יש מילה נבחרת והלומד הקיש על מילה שכבר מונחת בחלל → זו הנחה באותו חלל */
  if (s4Selected && s4Selected !== id && s4Placement[id] !== 'source') {
    const moved = s4Selected;
    s4Selected = null;
    s4Place(moved, s4Placement[id]);
    s4Render();
    return;
  }
  s4Selected = (s4Selected === id) ? null : id;
  s4Say(s4Selected ? s4WordLabel(id) + ' تم الاختيار. اختاروا منطقة للوضع.' : '');
  s4Render();
}
function s4CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) s4Tap(id);
}
function s4ZoneClick(z, e) {
  dndGhStop('s4', true);
  if (e && e.target.closest && e.target.closest('.s4-card')) return; // הקשה על מילה מטופלת ב-s4Tap
  if (s4Done || !s4Selected) return;
  s4DismissRetry();
  const id = s4Selected;
  s4Selected = null;
  s4Place(id, z);
  s4Render();
}
function s4ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s4ZoneClick(z);
}
function s4TrayClick(e) {
  if (s4Done || !s4Selected || (e.target.closest && e.target.closest('.s4-card'))) return;
  if (s4Placement[s4Selected] === 'source') return;
  s4DismissRetry();
  s4Placement[s4Selected] = 'source';
  s4Say(s4WordLabel(s4Selected) + ' تمت إعادته إلى القائمة');
  s4Selected = null;
  s4Render();
}

function s4MarkByZone() {
  s4Marks = {};
  S4.zones.forEach(function (z) {
    const id = s4Occupant(z, null);
    if (id) s4Marks[id] = s4IsRight(z) ? 'correct' : 'wrong';
  });
}

function s4Check() {
  if (s4Done) { advanceScreen(); return; }
  if (!s4AllFilled()) return;
  s4Selected = null;
  s4Attempts++;
  const okCount = S4.zones.filter(s4IsRight).length;
  const ok = okCount === S4.zones.length;
  /* xAPI: sequencing — the step texts in zone order (מקום 1..6). */
  xapiAnswered('004', 'q1', ok, ok || s4Attempts >= S4.maxAttempts, { order: S4.zones.map(function (z) { var id = s4Occupant(z, null); return id ? s4WordLabel(id) : ''; }) });
  s4Partial = okCount > 0 && !ok;
  if (ok) {
    s4Done = true;
    s4Outcome = 'correct';
    s4MarkByZone();
    s4Render();
    s4ShowPopup('correct');
    s4Finish();
  } else if (s4Attempts >= S4.maxAttempts) {
    s4Done = true;
    s4Outcome = 'wrong2';
    s4Answer = Object.assign({}, s4Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s4View = 'solution';
    s4ApplyView();
    s4Finish();
  } else {
    s4LastWrong = s4Snapshot();
    s4MarkByZone(); // חיווי per-חלל גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
    s4Render();
    s4ShowPopup('retry');
    const btn = document.getElementById('s4q-check');
    if (btn) btn.disabled = true; // Retry gate
    s4Say((s4Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s4Finish() {
  const btn = document.getElementById('s4q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s4q-hint')?.classList.add('s3q-hint-done');
  s4CloseHint();
  syncPracticeProgressNav(document.getElementById('s4'));
}

function s4ShowSolution() {
  S4.order.forEach(function (id) { s4Placement[id] = 'source'; });
  S4.zones.forEach(function (z) { s4Placement[S4.correct[z]] = z; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s4ApplyView() {
  if (s4Answer === null) return;
  if (s4View === 'answer') Object.assign(s4Placement, s4Answer);
  else s4ShowSolution();
  s4MarkByZone();
  s4Render();
  s4ShowPopup('wrong2', s4View);
}
function s4ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s4Answer === null) return;
  s4View = (s4View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s4ApplyView();
}

function s4ShowPopup(type, view) {
  const cfg = S4_FEEDBACK[type];
  const popup = document.getElementById('s4q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": רק הכותרת והכפתור מתחלפים — גוף המשוב המלא נשאר
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהחללים (לא כולם) → "התשובה נכונה חלקית." במקום "אינה נכונה" גורף */
  if (s4Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s4Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (s4Partial && type === 'wrong2' && view === 'answer') title = 'الإجابة صحيحة جزئيًا.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s4q-popup-title').innerHTML = title;
  document.getElementById('s4q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s4q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s4ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
/* ערבוב סדר המשפטים ברשימה — פעם אחת בטעינת העמוד (הסדר נשמר לאורך הביקור במסך) */
(function s4Shuffle() {
  const tray = document.getElementById('s4-tray');
  if (!tray) return;
  const slots = Array.prototype.slice.call(tray.children);
  const inOrder = function () { return slots.every(function (s, i) { return s.firstElementChild.id === 's4-d-' + S4.order[i]; }); };
  do {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = slots[i]; slots[i] = slots[j]; slots[j] = t;
    }
  } while (inOrder()); // לא להציג את הסדר הנכון כנקודת פתיחה
  slots.forEach(function (s) { tray.appendChild(s); });
})();

/* גובה האיזור והשלב = גובה השלב הגבוה ביותר (שלב ארוך עוטף לשתי שורות); הרוחב קבוע 521 (Figma). נמדד כשהמסך מוצג */
function s4Fit() {
  const sec = document.getElementById('s4');
  if (!sec) return;
  sec.style.removeProperty('--s4-h'); // מדידת הגובה הטבעי
  let h = 0;
  sec.querySelectorAll('.s4-slot > .s4-card').forEach(function (c) {
    /* שלב שהונח באיזור מוסתר מהרשימה (offsetHeight = 0) — משתמשים בגובה שנמדד כשהיה גלוי */
    if (c.offsetHeight) c.dataset.fitH = c.offsetHeight;
    h = Math.max(h, +c.dataset.fitH || 0);
  });
  if (!h) return; // המסך מוסתר — יימדד בכניסה
  sec.style.setProperty('--s4-h', h + 'px');
}
window.addEventListener('resize', s4Fit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(s4Fit); });

function resetScreenState4() {
  requestAnimationFrame(function () { requestAnimationFrame(s4Fit); }); // אחרי שהמסך הופך ל-active
  syncPracticeProgressNav(document.getElementById('s4'));
  s4InitDnd();
  document.getElementById('s4q-popup')?.classList.add('hidden');
  s4CloseHint();
  s4Selected = null;
  if (s4Done) {
    if (s4Outcome === 'wrong2') { s4View = 'solution'; s4ShowSolution(); }
    s4MarkByZone();
    s4Render();
    const btn = document.getElementById('s4q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s4q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s4Render();
}
function s4ReopenPopup() {
  if (s4Outcome === 'wrong2') { s4View = 'solution'; s4ApplyView(); }
  else if (s4Outcome) s4ShowPopup(s4Outcome);
}
function s4ClosePopups() {
  document.getElementById('s4q-popup')?.classList.add('hidden');
  s4CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s4OpenHint() {
  if (s4Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s4q-hint-overlay')?.classList.remove('hidden');
}
function s4CloseHint() { document.getElementById('s4q-hint-overlay')?.classList.add('hidden'); }
function s4CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s4CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s4PopupDrag = null;
function s4PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s4q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s4PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s4PopupMove, { passive: false });
  document.addEventListener('pointerup', s4PopupUp);
  document.addEventListener('pointercancel', s4PopupUp);
  e.preventDefault();
}
function s4PopupMove(e) {
  if (!s4PopupDrag || e.pointerId !== s4PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s4PopupUp(e); return; }
  const popup = document.getElementById('s4q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s4PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s4PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s4PopupUp(e) {
  if (s4PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s4PopupDrag.id) return;
  s4PopupDrag = null;
  document.removeEventListener('pointermove', s4PopupMove);
  document.removeEventListener('pointerup', s4PopupUp);
  document.removeEventListener('pointercancel', s4PopupUp);
}

/* ---------- מחוות-יד (גרירה / לחיצה) — 720-templates → _gesture-hints.md. מועתק ממנגנון סיין 2 (מסכים 4–7).
   שתי נקודות-עוגן אמיתיות מהגיאומטריה החיה (כרטיס מקור ואזור יעד פנוי); היד נעה רק בכיוון המלמד (כרטיס → אזור);
   persistent עד שהלומד מתחיל אינטראקציה בפועל. מסך בחירה (mode: click) — לחיצה במקום אחד, בלי תנועה.
   הדגמה דקורטיבית בלבד — הזוג אינו מפתח תשובה. ---------- */
var DND_GH = {
  s1: { screen: 1, mode: 'drag', stage: '#s1 .s1-inner', card: '#s1-tray .s1-card:not(.is-ghost)', zone: '#s1 .s1-zone:not(.occupied)', done: function () { return s1Done; } },
  s2: { screen: 2, mode: 'drag', stage: '#s2', card: '#s2-tray .s2-card:not(.is-ghost)', zone: '#s2 .s2-zone:not(.occupied)', done: function () { return s2Done; } },
  s3: { screen: 3, mode: 'click', stage: '#s3', target: '#s3 .s3-card__frame', corner: 'right', done: function () { return s3Done; } },
  s4: { screen: 4, mode: 'drag', stage: '#s4 .s4-inner', card: '#s4-tray .s4-card:not(.is-ghost)', zone: '#s4 .s4-zone:not(.occupied)', done: function () { return s4Done; } }
};
var dndGhState = {};
Object.keys(DND_GH).forEach(function (k) { dndGhState[k] = { token: 0, understood: false }; });

function dndGhCenter(stage, el) { // מרכז האלמנט במערכת-הקואורדינטות של ה-stage (ללא scale)
  const sr = stage.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  const k = sr.width ? (stage.offsetWidth / sr.width) : 1;
  return { x: (r.left - sr.left + r.width / 2) * k, y: (r.top - sr.top + r.height / 2) * k };
}

function dndGhStart(id) {
  const st = dndGhState[id];
  const cfg = DND_GH[id];
  if (st.understood || cfg.done()) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const token = ++st.token;
  const gh = document.getElementById(id + '-gh');
  const stage = document.querySelector(cfg.stage);
  if (!gh || !stage) return;
  const alive = function () { return token === st.token && !st.understood; };
  const later = function (fn, ms) { setTimeout(function () { if (alive()) fn(); }, ms); };
  const put = function (p) {
    gh.style.left = (p.x - gh.offsetWidth / 2) + 'px';
    gh.style.top = (p.y - gh.offsetHeight / 2) + 'px';
  };

  let ghRuns = 0; // ההבהוב מופיע פעמיים בלבד ואז נעלם (עדכון מעצבת; גם לנגישות)
  function cycle() {
    if (ghRuns >= 2) { gh.classList.remove('is-on', 'is-moving', 'is-click'); gh.classList.add('hidden'); return; }
    ghRuns++;
    if (cfg.done()) return;
    gh.classList.remove('is-on', 'is-moving', 'is-click');
    if (cfg.mode === 'click') {
      const target = document.querySelector(cfg.target);
      if (!target) { ghRuns--; later(cycle, 1000); return; }
      gh.classList.remove('hidden');
      const c = dndGhCenter(stage, target);
      if (cfg.corner === 'right') { // היד בפינה הימנית-העליונה של הכרטיסייה (כמו בכרטיסיות המתהפכים)
        const sr = stage.getBoundingClientRect(), tr = target.getBoundingClientRect();
        const k = sr.width ? (stage.offsetWidth / sr.width) : 1;
        c.x += (tr.width * k) / 2 - 40;
        c.y -= (tr.height * k) / 2 - 40;
      }
      put(c);
      void gh.offsetWidth;
      later(function () {
        gh.classList.add('is-on', 'is-click');   // הופעה + לחיצה במקום אחד
        later(function () {
          gh.classList.remove('is-on');          // דהייה במקום
          later(cycle, 1100);
        }, 2000);
      }, 50);
      return;
    }
    const card = document.querySelector(cfg.card);
    const zone = document.querySelector(cfg.zone);
    if (!card || !zone) { ghRuns--; later(cycle, 1000); return; }
    const a = dndGhCenter(stage, card);
    const b = dndGhCenter(stage, zone);
    gh.classList.remove('hidden');
    put(a);
    void gh.offsetWidth;
    later(function () {
      gh.classList.add('is-on', 'is-click');     // שלב 1: הופעה + לחיצה על הכרטיס
      later(function () {
        gh.classList.remove('is-click');
        void gh.offsetWidth;
        gh.classList.add('is-moving');           // שלב 2: גרירה אל האזור (קדימה בלבד)
        put(b);
        later(function () {                      // שלב 3: עמידה ביעד, ואז דהייה במקום
          gh.classList.remove('is-on');
          later(function () {                    // שלב 4: שקופה לגמרי → חוזרים להתחלה
            gh.classList.remove('is-moving');
            later(cycle, 400);
          }, 300);
        }, 1100 + 600);
      }, 1200);
    }, 50);
  }
  later(cycle, 1400); // אחרי שאנימציית-הכניסה של המסך הסתיימה
}

function dndGhStop(id, understood) {
  const st = dndGhState[id];
  if (!st) return;
  st.token++;
  if (understood) st.understood = true;
  const gh = document.getElementById(id + '-gh');
  if (gh) {
    gh.classList.remove('is-on', 'is-moving', 'is-click');
    gh.classList.add('hidden');
  }
}
function dndGhStopAll() { Object.keys(DND_GH).forEach(function (k) { dndGhStop(k, false); }); }
function dndGhEnter(n) { Object.keys(DND_GH).forEach(function (k) { if (DND_GH[k].screen === n) dndGhStart(k); }); }


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (5) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['002', 1],
  3: ['003', 1],
  4: ['004', 1]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-05';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-05.json';
var XAPI_END_BTN = 's4q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = ['001/q1', '002/q1', '003/q1', '004/q1'];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
var XAPI_PASS = 0.6;

/* תוצאת הרכיב ל-completed (§6.4): correct / all graded catalogue questions this part reports
   (unanswered = wrong), success at XAPI_PASS. No threshold is promised on screen in this part;
   0.6 is the family default (mass-gas-01). */
function xapiPartResult() {
  var ok = XAPI_PART_QUESTIONS.filter(function (k) { return XAPI_Q_RESULTS[k] === true; }).length;
  var n = XAPI_PART_QUESTIONS.length || 1;
  return { success: ok / n >= XAPI_PASS, score: { scaled: Math.round((ok / n) * 1000) / 1000 } };
}

/* Option id 'a'..'d' -> answers index. Every single-choice screen of this unit lists its options in the
   catalogue's answers order, so the index is the identifier (a <br> or a tooltip in the label never
   reaches the statement). Verified per question on 2026-11-02 (docs-and-tools/REPORT-XAPI.md). */
function xapiOptIdx(id) { return 'abcdefgh'.indexOf(String(id)); }

/* הלחיצה האחרונה של הסין: מדווח completed ועוצר. Kata מסירה את הרכיב ומנתבת (§6.5, §8.12).
   אין window.close, אין alert, אין ניווט — ההמשך לסין הבא חי רק תחת DEV_NAV (סיור מקומי). */
function partFinish(btn) {
  try { xapiEndComponent(xapiPartResult(), btn || document.getElementById(XAPI_END_BTN)); } catch (e) { console.error('[xAPI] partFinish', e); }
  try { flushResumeSave(); } catch (e) {}
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-06/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (39 in this part, listed by the generator from the top-level let/const declarations,
   transient ones — pointer DnD instances, timers, popup drags — excluded), the DOM-only values (typed
   inputs, dropdown texts) and one painter per interactive screen (§8.8 rules 1–12).
   
   payload = { currentScreen, qResults, vars: { <name>: value }, dom: { inputs, dq } }. A Set travels
   as { __set: [...] }; a const object / array is refilled in place (never re-bound). */
function _rsPack(x) {
  if (x instanceof Set) return { __set: Array.from(x) };
  if (x && typeof x === 'object') { try { return JSON.parse(JSON.stringify(x)); } catch (e) { return null; } }
  return x === undefined ? null : x;
}
function _rsUnpack(x) { return (x && typeof x === 'object' && Array.isArray(x.__set)) ? new Set(x.__set) : x; }
function _rsAssign(target, src) {
  if (Array.isArray(target)) { target.length = 0; (src || []).forEach(function (e) { target.push(e); }); return; }
  Object.keys(target).forEach(function (k) { delete target[k]; });
  Object.assign(target, src || {});
}
function rsDomCapture() {
  var inputs = {}, dq = {};
  document.querySelectorAll('#app input[type="text"][id]').forEach(function (i) { inputs[i.id] = i.value; });
  document.querySelectorAll('#app [id^="dq-selected-"]').forEach(function (e) {
    var b = document.getElementById('dq-btn-' + e.id.slice(12));
    dq[e.id] = { t: e.textContent, empty: !b || b.hasAttribute('data-empty') };
  });
  return { inputs: inputs, dq: dq };
}
function rsDomRestore(d) {
  if (!d) return;
  Object.keys(d.inputs || {}).forEach(function (id) { var i = document.getElementById(id); if (i && typeof d.inputs[id] === 'string') i.value = d.inputs[id]; });
  Object.keys(d.dq || {}).forEach(function (id) {
    var e = document.getElementById(id), s = d.dq[id]; if (!e || !s) return;
    if (typeof s.t === 'string') e.textContent = s.t;
    var b = document.getElementById('dq-btn-' + id.slice(12));
    if (b) { if (s.empty) b.setAttribute('data-empty', ''); else b.removeAttribute('data-empty'); }
  });
}

/* ── 1. capture ── */
function capturePartPayload() {
  return {
    currentScreen: currentScreen,
    qResults: Object.assign({}, XAPI_Q_RESULTS),
    vars: {
      practiceProgress: _rsPack(practiceProgress),
      s1Placement: _rsPack(s1Placement),
      s1Marks: _rsPack(s1Marks),
      s1Selected: _rsPack(s1Selected),
      s1Attempts: _rsPack(s1Attempts),
      s1Done: _rsPack(s1Done),
      s1Outcome: _rsPack(s1Outcome),
      s1LastWrong: _rsPack(s1LastWrong),
      s1Partial: _rsPack(s1Partial),
      s1Answer: _rsPack(s1Answer),
      s1View: _rsPack(s1View),
      s2Placement: _rsPack(s2Placement),
      s2Marks: _rsPack(s2Marks),
      s2Selected: _rsPack(s2Selected),
      s2Attempts: _rsPack(s2Attempts),
      s2Done: _rsPack(s2Done),
      s2Outcome: _rsPack(s2Outcome),
      s2LastWrong: _rsPack(s2LastWrong),
      s2Partial: _rsPack(s2Partial),
      s2Answer: _rsPack(s2Answer),
      s2View: _rsPack(s2View),
      s3Selected: _rsPack(s3Selected),
      s3Marks: _rsPack(s3Marks),
      s3Attempts: _rsPack(s3Attempts),
      s3Done: _rsPack(s3Done),
      s3Outcome: _rsPack(s3Outcome),
      s3LastWrong: _rsPack(s3LastWrong),
      s3Partial: _rsPack(s3Partial),
      s3View: _rsPack(s3View),
      s4Placement: _rsPack(s4Placement),
      s4Marks: _rsPack(s4Marks),
      s4Selected: _rsPack(s4Selected),
      s4Attempts: _rsPack(s4Attempts),
      s4Done: _rsPack(s4Done),
      s4Outcome: _rsPack(s4Outcome),
      s4LastWrong: _rsPack(s4LastWrong),
      s4Partial: _rsPack(s4Partial),
      s4Answer: _rsPack(s4Answer),
      s4View: _rsPack(s4View)
    },
    dom: rsDomCapture()
  };
}

/* ── 2. variables (never the DOM). Safe with a stage-A / partial payload. ── */
function applyResumeVars(st) {
  if (!st) return;
  if (st.qResults) Object.keys(st.qResults).forEach(function (k) { XAPI_Q_RESULTS[k] = !!st.qResults[k]; });
  var v = st.vars; if (!v || typeof v !== 'object') return;
  var has = function (k) { return Object.prototype.hasOwnProperty.call(v, k) && v[k] !== undefined; };
  if (has('s1Marks')) s1Marks = _rsUnpack(v.s1Marks);
  if (has('s1Selected')) s1Selected = _rsUnpack(v.s1Selected);
  if (has('s1Attempts')) s1Attempts = _rsUnpack(v.s1Attempts);
  if (has('s1Done')) s1Done = _rsUnpack(v.s1Done);
  if (has('s1Outcome')) s1Outcome = _rsUnpack(v.s1Outcome);
  if (has('s1LastWrong')) s1LastWrong = _rsUnpack(v.s1LastWrong);
  if (has('s1Partial')) s1Partial = _rsUnpack(v.s1Partial);
  if (has('s1Answer')) s1Answer = _rsUnpack(v.s1Answer);
  if (has('s1View')) s1View = _rsUnpack(v.s1View);
  if (has('s2Marks')) s2Marks = _rsUnpack(v.s2Marks);
  if (has('s2Selected')) s2Selected = _rsUnpack(v.s2Selected);
  if (has('s2Attempts')) s2Attempts = _rsUnpack(v.s2Attempts);
  if (has('s2Done')) s2Done = _rsUnpack(v.s2Done);
  if (has('s2Outcome')) s2Outcome = _rsUnpack(v.s2Outcome);
  if (has('s2LastWrong')) s2LastWrong = _rsUnpack(v.s2LastWrong);
  if (has('s2Partial')) s2Partial = _rsUnpack(v.s2Partial);
  if (has('s2Answer')) s2Answer = _rsUnpack(v.s2Answer);
  if (has('s2View')) s2View = _rsUnpack(v.s2View);
  if (has('s3Selected')) s3Selected = _rsUnpack(v.s3Selected);
  if (has('s3Marks')) s3Marks = _rsUnpack(v.s3Marks);
  if (has('s3Attempts')) s3Attempts = _rsUnpack(v.s3Attempts);
  if (has('s3Done')) s3Done = _rsUnpack(v.s3Done);
  if (has('s3Outcome')) s3Outcome = _rsUnpack(v.s3Outcome);
  if (has('s3LastWrong')) s3LastWrong = _rsUnpack(v.s3LastWrong);
  if (has('s3Partial')) s3Partial = _rsUnpack(v.s3Partial);
  if (has('s3View')) s3View = _rsUnpack(v.s3View);
  if (has('s4Marks')) s4Marks = _rsUnpack(v.s4Marks);
  if (has('s4Selected')) s4Selected = _rsUnpack(v.s4Selected);
  if (has('s4Attempts')) s4Attempts = _rsUnpack(v.s4Attempts);
  if (has('s4Done')) s4Done = _rsUnpack(v.s4Done);
  if (has('s4Outcome')) s4Outcome = _rsUnpack(v.s4Outcome);
  if (has('s4LastWrong')) s4LastWrong = _rsUnpack(v.s4LastWrong);
  if (has('s4Partial')) s4Partial = _rsUnpack(v.s4Partial);
  if (has('s4Answer')) s4Answer = _rsUnpack(v.s4Answer);
  if (has('s4View')) s4View = _rsUnpack(v.s4View);
  if (has('practiceProgress') && v.practiceProgress && typeof v.practiceProgress === 'object') _rsAssign(practiceProgress, _rsUnpack(v.practiceProgress));
  if (has('s1Placement') && v.s1Placement && typeof v.s1Placement === 'object') _rsAssign(s1Placement, _rsUnpack(v.s1Placement));
  if (has('s2Placement') && v.s2Placement && typeof v.s2Placement === 'object') _rsAssign(s2Placement, _rsUnpack(v.s2Placement));
  if (has('s4Placement') && v.s4Placement && typeof v.s4Placement === 'object') _rsAssign(s4Placement, _rsUnpack(v.s4Placement));
}

/* ── 3. what lives only in the DOM (runs AFTER goTo; the painter re-derives the buttons, rule 11) ── */
function applyResumeDom(st) { if (st) rsDomRestore(st.dom); }

/* ── painters by template (guide §8.8). Every painter is idempotent: repaintScreen runs it on EVERY
   navigation, and the screen's own resetScreenStateN has already run from the restored variables
   (goTo) — so a solved screen is usually painted already and only its feedback popup is re-opened;
   an in-progress screen gets its attempt marks back only while the submitted choice is still the
   current one (rule 10), its hint button, its Retry gate and its retry feedback. ── */
function rsEl(id) { return document.getElementById(id); }
function rsHintOn(id) { var h = rsEl(id); if (h) h.classList.add('hint-on'); }
function rsFn(name) { try { var f = eval(name); return typeof f === 'function' ? f : null; } catch (e) { return null; } }
/* single choice: options a..d, sNqMark / sNqFinish / sNqSelect / sNqShowPopup / sNqReopenPopup */
function rsPaintScq(c) {
  if (c.done) {
    if (c.sel) c.mark(c.sel, c.out === 'correct' ? 'correct' : 'wrong');
    if (c.out !== 'correct') c.mark(c.correct, 'correct');
    c.finish(c.out);
    if (c.reopen) c.reopen();
    return;
  }
  if (c.att > 0) rsHintOn(c.hint);
  if (c.att > 0 && c.lw !== null && c.sel === c.lw) {
    c.mark(c.lw, 'wrong');
    var cb = rsEl(c.check); if (cb) cb.disabled = true;   /* Retry gate */
    if (c.showPopup) c.showPopup('retry');
    return;
  }
  if (c.sel && c.select) c.select(c.sel);
}
/* drag & drop (zones / cards): sNRender from the restored placement + marks, sNUpdateCheck for the gate */
function rsPaintDnd(c) {
  if (c.done) {
    if (c.reopen) c.reopen();
    else if (c.out === 'correct' && c.showPopup) c.showPopup('correct');
    return;
  }
  if (c.render) c.render();
  if (c.att > 0) {
    rsHintOn(c.hint);
    if (c.showPopup && c.lw !== null && c.snap && c.snap() === c.lw) c.showPopup('retry');
  }
  if (c.update) c.update();
}
/* dropdowns (several per screen): the texts come back through applyResumeDom; here the marks and the gate */
function rsPaintDd(c) {
  if (c.done) {
    if (c.reopen) c.reopen();
    else if (c.showPopup) c.showPopup(c.out === 'correct' ? 'correct' : 'wrong2');
    return;
  }
  var any = false, res = c.results ? c.results() : null;
  c.idx.forEach(function (i) {
    var b = c.btn(i); if (b && c.sel[i] !== null) b.removeAttribute('data-empty');
    if (c.att > 0 && c.lw[i] !== null && c.sel[i] === c.lw[i]) { c.markOne(i, false); any = true; }
    else if (c.att > 0 && c.sel[i] !== null && res && res[i]) c.markOne(i, true);
  });
  if (c.att > 0) rsHintOn(c.hint);
  if (any && c.showPopup) c.showPopup('retry');
  if (c.update) c.update();
}

/* ── 4. painter dispatch — one branch per interactive screen (rule 11); exception-safe per screen ── */
function restoreScreenUI(n) {
  try {
    switch (n) {
    case 1: rsPaintDnd({ done: s1Done, att: s1Attempts, lw: s1LastWrong, out: s1Outcome, render: rsFn('s1Render'), snap: rsFn('s1Snapshot'),
      update: rsFn('s1UpdateCheck'), showPopup: rsFn('s1ShowPopup'), reopen: rsFn('s1ReopenPopup'), hint: 's1q-hint' }); break;
    case 2: rsPaintDnd({ done: s2Done, att: s2Attempts, lw: s2LastWrong, out: s2Outcome, render: rsFn('s2Render'), snap: rsFn('s2Snapshot'),
      update: rsFn('s2UpdateCheck'), showPopup: rsFn('s2ShowPopup'), reopen: rsFn('s2ReopenPopup'), hint: 's2q-hint' }); break;
    case 3: /* multiple choice — s3Render paints from s3Selected + s3Marks (resetScreenState3 cleared the marks before the second applyResumeVars restored them) */
      if (s3Done) { var rp3 = rsFn('s3ReopenPopup'); if (rp3) rp3(); else s3ShowPopup(s3Outcome === 'correct' ? 'correct' : 'wrong2', s3View); }
      else { s3Render(); if (s3Attempts > 0) { rsHintOn('s3q-hint'); if (s3LastWrong !== null && s3SetsEqual(s3Selected, s3LastWrong)) s3ShowPopup('retry'); } s3UpdateCheck(); } break;
    case 4: rsPaintDnd({ done: s4Done, att: s4Attempts, lw: s4LastWrong, out: s4Outcome, render: rsFn('s4Render'), snap: rsFn('s4Snapshot'),
      update: rsFn('s4UpdateCheck'), showPopup: rsFn('s4ShowPopup'), reopen: rsFn('s4ReopenPopup'), hint: 's4q-hint' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

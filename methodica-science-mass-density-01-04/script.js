'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   הועתק מהמנוע המאומת של methodica-science-mass-density-01-01
   (סיין 1), ריק מתוכן פרטני של אותו סיין. TOTAL_SCREENS יעודכן
   ל-2+ עם הוספת כל מסך אמיתי (שלב זה: מסך placeholder יחיד).
   ========================================================= */

const TOTAL_SCREENS = 3; // סיין 4 נבנה מסך אחר מסך — מתעדכן עם כל מסך חדש
let currentScreen = 0;

/* הדמות שתיבחר במסך הראשון (אם קיים מסך כזה ביחידה זו) תישמר
   ב-localStorage כי כל סיין הוא מסמך HTML נפרד לחלוטין —
   window.lomdaState לא "עובר" בין הסינים בטעינת עמוד מלאה.
   שם המפתח משותף לכל סיני הפרויקט הזה (namespaced לפרויקט, לא
   לסיין הבודד) כדי שבחירת דמות תישמר גם במעבר בין סינים.
   try/catch: בפתיחה מ-file:// חלק מהדפדפנים (ולמשל jsdom) חוסמים
   גישה ל-localStorage עם SecurityError — בלי ה-try/catch, חריגה
   כאן הייתה עוצרת את טעינת כל script.js */
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
  if (n < 0 || n >= TOTAL_SCREENS) return;
  const prev = document.querySelector('.screen.active');
  if (window.Motion) Motion.cancel(prev);
  s1CloseExample();
  if (currentScreen === 2 && n !== 2) s2ClosePopups();
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active');
  });
  if (currentScreen === 0 && n !== 0) { const v = document.getElementById('s0-char-video'); if (v) v.pause(); }
  const target = document.querySelector('.screen[data-screen="' + n + '"]');
  if (!target) return;
  if (typeof wakeMedia === 'function') wakeMedia(target);   /* lazy media (../unit-js/05-media.js): before resetScreenState, which may play() */
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
  if (window.Motion) Motion.reveal(target);
  if (viaBack && n === 2 && s2Done) s2ReopenPopup();
  /* 720 platform layer (guide §6.7 / §8.3 / §8.4a): repaint an answered screen on EVERY navigation,
     open/close the catalogue item, arm the debounced state save. All typeof-guarded and swallowed —
     a reporting failure can never stop the learner. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}
}

/* animation-system: קריאה נוספת חד-פעמית למסך הראשוני בטעינת העמוד
   (goTo לא רץ על המסך שכבר active-מלכתחילה ב-HTML) — ראו motion.js/
   SKILL.md, "Wiring". */
if (window.Motion) Motion.reveal(document.querySelector('.screen.active'));

function resetScreenState(n) {
  /* כל מסך שנוסף מקבל כאן שורת if (n === X) resetScreenStateX(); משלו,
     ומגדיר את הפונקציה resetScreenStateX() ליד קטע ה-HTML/JS של המסך. */
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState2();
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

/* ---------- ניווט גנרי (Continue/Back + Ctrl+חצים) ---------- */
function advanceScreen() {
  if (currentScreen === 2 && !s2Done) return; // מסך 3: ההמשך נפתח רק אחרי שהשאלה נפתרה (resolved, לא correctness)
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() { goTo(currentScreen - 1, true); }
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
});

/* מסך 1 (TransitionScreen, שקף 59): סטטי; הדמות מתנגנת פעם אחת ונשארת על הפריים האחרון.
   יציאה באמצע → חזרה ממשיכה מאותה נקודה (לא מאפסים). */
function resetScreenState0() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
resetScreenState0(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

/* מסך 2 (משימת כיתה, שקפים 60+61): לחיצה על הדמות/הבועה פותחת פופאפ דוגמת גרף;
   "חזרה למשימה" / לחיצה על הרקע / Escape סוגרים. הפופאפ נסגר בכל מעבר מסך (goTo). */
function resetScreenState1() {
  const vid = document.getElementById('s1-char-video');
  if (vid && vid.paused) vid.play().catch(function () {});
}
function s1OpenExample() {
  const pop = document.getElementById('s1-example-popup');
  if (!pop) return;
  pop.classList.remove('hidden');
  const btn = document.getElementById('s1-example-close');
  if (btn) btn.focus();
}
function s1CloseExample() {
  const pop = document.getElementById('s1-example-popup');
  if (!pop || pop.classList.contains('hidden')) return;
  pop.classList.add('hidden');
  const ch = document.getElementById('s1-char');
  if (ch && currentScreen === 1) ch.focus();
}
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') s1CloseExample();
});

/* =========================================================
   מסך 3 (#s2) — DropdownQuestion × 6 דרופדאונים (שקף 62). לוגיקה כמו מסך 5 בסיין 3 (s4*), ל-6 דרופדאונים.
   • נכון: 1=ד, 2=ג, 3=א, 4+5 = {א,ב} (בכל סדר), 6=ג. נכון רק כשהכול נכון. 2 ניסיונות (משותפים). אין רמז (התסריט שותק).
   • שגוי לא-סופי: הנכון בירוק (✓) והשגוי באדום (✗); הערך הנכון של השגוי לא נחשף. Retry gate: "צדקתי?" כבוי עד ששגוי אחד לפחות שונה.
   • "נכון חלקית" כשחלק מהדרופדאונים נכונים. שגוי סופי: הפתרון מוצג + View My Answer Toggle; חזרה למסך פתור — תמיד בתצוגת הפתרון.
   ========================================================= */
const S2_N = [1, 2, 3, 4, 5, 6];
const S2Q = { correct: { 1: 'ث', 2: 'ت', 3: 'أ', 4: 'أ', 5: 'ب', 6: 'ت' }, floatSet: ['أ', 'ب'], maxAttempts: 2 };
const S2_CHECK_SVG = '<img class="dq-check-ico" src="../unit-assets/icons/icon-answerbox-check-green.svg" width="16" height="16" alt="">';
const S2_WRONG_SVG = '<img class="dq-wrong-ico" src="../unit-assets/icons/icon-answerbox-x-red.svg" width="16" height="16" alt="">';
const S2_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: [] },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: [],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

let s2Selected = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null };
let s2LastWrong = { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null }; // Retry gate — הבחירות שסומנו שגויות בניסיון הלא-סופי האחרון
let s2Attempts = 0;
let s2Done = false;
let s2Outcome = null;     // 'correct' | 'wrong2'
let s2Partial = false;    // חלק מהדרופדאונים נכונים → "התשובה נכונה חלקית."
let s2Answer = null;      // צילום בחירות הלומד בשגוי הסופי
let s2View = 'solution';

function s2Btn(i) { return document.getElementById('dq-btn-' + i); }
function s2List(i) { return document.getElementById('dq-list-' + i); }
function s2Say(msg) { const el = document.getElementById('s2-live'); if (el) el.textContent = msg; }
function s2OpenIdx() { return S2_N.find(function (i) { const l = s2List(i); return l && !l.classList.contains('hidden'); }) || null; }

function s2Open(i) {
  if (s2Done) return;
  s2Close();
  s2DismissRetry();
  s2List(i).classList.remove('hidden');
  s2Btn(i).setAttribute('aria-expanded', 'true');
  s2List(i).querySelectorAll('.dq-option').forEach(function (o) {
    o.classList.toggle('is-selected', o.dataset.value === s2Selected[i]);
  });
}
function s2Close() {
  S2_N.forEach(function (i) {
    const list = s2List(i), btn = s2Btn(i);
    if (list) list.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}
function s2Toggle(i) {
  if (s2Done) return;
  if (s2List(i).classList.contains('hidden')) s2Open(i); else s2Close();
}
function s2Select(i, value) {
  if (s2Done) return;
  s2DismissRetry();
  s2Selected[i] = value;
  s2ClearMark(i); // בחירה חדשה מבטלת את החיווי הקודם של אותו דרופדאון
  const btn = s2Btn(i);
  btn.removeAttribute('data-empty');
  document.getElementById('dq-selected-' + i).textContent = value;
  s2Close();
  btn.focus();
  s2Say('تم الاختيار: ' + value);
  s2UpdateCheck();
  /* resume: a pick is learner state this part never commits through xapiAnswered (no catalogue question),
     so arm the debounced save here — otherwise a reload mid-task loses every pick (live 2026-11-02, §6.1). */
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}
}
function s2UpdateCheck() {
  if (s2Done) return;
  const btn = document.getElementById('s2q-check');
  if (!btn) return;
  const filled = S2_N.every(function (i) { return s2Selected[i] !== null; });
  const hadRetry = S2_N.some(function (i) { return s2LastWrong[i] !== null; });
  const changed = S2_N.some(function (i) { return s2LastWrong[i] !== null && s2Selected[i] !== s2LastWrong[i]; });
  btn.disabled = !filled || (hadRetry && !changed);
}
function s2DismissRetry() {
  if (s2Done) return;
  document.getElementById('s2q-popup')?.classList.add('hidden');
  S2_N.forEach(function (i) { if (s2LastWrong[i] !== null) s2ClearMark(i); }); // הנכון נשאר ירוק עד לבדיקה הבאה
}
function s2ClearMark(i) {
  const btn = s2Btn(i);
  if (!btn) return;
  btn.classList.remove('dq-correct', 'dq-wrong');
  btn.querySelector('.dq-check-ico')?.remove();
  btn.querySelector('.dq-wrong-ico')?.remove();
}
function s2MarkOne(i, ok) {
  const btn = s2Btn(i);
  s2ClearMark(i);
  btn.classList.add(ok ? 'dq-correct' : 'dq-wrong');
  btn.insertAdjacentHTML('beforeend', ok ? S2_CHECK_SVG : S2_WRONG_SVG);
}
/* שאלה 4 (שני דרופדאונים): {א,ב} בכל סדר — כל דרופדאון נכון אם הערך בקבוצה ושונה מהדרופדאון השני */
function s2Results(sel) {
  const r = {};
  [1, 2, 3, 6].forEach(function (i) { r[i] = sel[i] === S2Q.correct[i]; });
  r[4] = S2Q.floatSet.indexOf(sel[4]) !== -1;
  r[5] = S2Q.floatSet.indexOf(sel[5]) !== -1 && sel[5] !== sel[4];
  return r;
}

/* לחיצה מחוץ לדרופדאון סוגרת רשימה פתוחה; חיצים/Enter/Space/Escape במקלדת */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('#s2 .dq-dropdown-wrap')) return;
  s2Close();
});
document.addEventListener('keydown', function (e) {
  const opt = e.target.closest && e.target.closest('#s2 .dq-option');
  if (opt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); opt.click(); return; }
  if (opt && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    const sib = e.key === 'ArrowDown' ? opt.nextElementSibling : opt.previousElementSibling;
    if (sib) sib.focus();
    return;
  }
  const b = e.target.closest && e.target.closest('#s2 .dq-btn');
  if (b && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !s2Done) {
    e.preventDefault();
    const k = parseInt(b.id.replace('dq-btn-', ''), 10);
    s2Open(k);
    s2List(k).querySelector('.dq-option')?.focus();
  }
  if (e.key === 'Escape' && s2OpenIdx()) { const k = s2OpenIdx(); s2Close(); s2Btn(k)?.focus(); }
});

function s2Check() {
  if (s2Done) { advanceScreen(); return; }
  if (!S2_N.every(function (i) { return s2Selected[i] !== null; })) return;
  s2Close();
  s2Attempts++;
  const res = s2Results(s2Selected);
  const okCount = S2_N.filter(function (i) { return res[i]; }).length;
  s2Partial = okCount > 0 && okCount < S2_N.length;
  if (okCount === S2_N.length) {
    s2Done = true;
    s2Outcome = 'correct';
    s2Lock();
    S2_N.forEach(function (i) { s2MarkOne(i, true); });
    s2ShowPopup('correct');
    s2Finish();
  } else if (s2Attempts >= S2Q.maxAttempts) {
    s2Done = true;
    s2Outcome = 'wrong2';
    s2Answer = Object.assign({}, s2Selected);
    s2View = 'solution';
    s2Lock();
    s2ApplyView();
    s2Finish();
  } else {
    S2_N.forEach(function (i) { s2LastWrong[i] = res[i] ? null : s2Selected[i]; });
    S2_N.forEach(function (i) { s2MarkOne(i, res[i]); });
    s2ShowPopup('retry');
    document.getElementById('s2q-check').disabled = true; // Retry gate
    s2Say((s2Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'هل نحاول مرة أخرى؟');
    try { flushResumeSave(); } catch (e) {}   /* resume: the attempt is committed (D-13) — synchronous, as xapiAnswered does elsewhere */
  }
}
function s2Lock() { S2_N.forEach(function (i) { s2Btn(i).disabled = true; }); }
function s2Finish() {
  const btn = document.getElementById('s2q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s2ApplyView() {
  if (s2Answer === null) return;
  const res = s2Results(s2Answer);
  S2_N.forEach(function (i) {
    const sel = document.getElementById('dq-selected-' + i);
    if (s2View === 'answer') {
      sel.textContent = s2Answer[i];
      s2MarkOne(i, res[i]);
    } else {
      sel.textContent = S2Q.correct[i];
      s2MarkOne(i, true);
    }
  });
  s2ShowPopup('wrong2', s2View);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
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
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": הטקסט הקבוע של המערכת
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  if (s2Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s2Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
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

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState2() {
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2Close();
  if (!s2Done) return; // החיווי של ניסיון לא-סופי נשמר כמו שהוא
  s2Lock();
  S2_N.forEach(function (i) {
    document.getElementById('dq-selected-' + i).textContent = S2Q.correct[i];
    s2MarkOne(i, true);
  });
  s2View = 'solution';
  const btn = document.getElementById('s2q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
}
function s2ReopenPopup() {
  if (s2Outcome === 'wrong2') { s2View = 'solution'; s2ApplyView(); }
  else if (s2Outcome) s2ShowPopup(s2Outcome);
}
function s2ClosePopups() {
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2Close();
}

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
function getAppScale() {
  const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}
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
  const nx = (e.clientX - rect.left) / scale - s2PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s2PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s2PopupUp(e) {
  if (s2PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s2PopupDrag.id) return;
  s2PopupDrag = null;
  document.removeEventListener('pointermove', s2PopupMove);
  document.removeEventListener('pointerup', s2PopupUp);
  document.removeEventListener('pointercancel', s2PopupUp);
}


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (3) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-04';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = {  };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-04.json';
var XAPI_END_BTN = 's2q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = [];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
var XAPI_PASS = 1;

/* תוצאת הרכיב ל-completed (§6.4). This component is a classroom task (catalogue: project-or-inquiry-task,
   no questions), so there is nothing Kata could grade: completion is the result. The dropdown screen's
   own verdict stays local. ⚠️ Open with the owner: whether to send success from the dropdown outcome. */
function xapiPartResult() {
  return { success: true };
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
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-05/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (8 in this part, listed by the generator from the top-level let/const declarations,
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
      s2Selected: _rsPack(s2Selected),
      s2LastWrong: _rsPack(s2LastWrong),
      s2Attempts: _rsPack(s2Attempts),
      s2Done: _rsPack(s2Done),
      s2Outcome: _rsPack(s2Outcome),
      s2Partial: _rsPack(s2Partial),
      s2Answer: _rsPack(s2Answer),
      s2View: _rsPack(s2View)
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
  if (has('s2Selected')) s2Selected = _rsUnpack(v.s2Selected);
  if (has('s2LastWrong')) s2LastWrong = _rsUnpack(v.s2LastWrong);
  if (has('s2Attempts')) s2Attempts = _rsUnpack(v.s2Attempts);
  if (has('s2Done')) s2Done = _rsUnpack(v.s2Done);
  if (has('s2Outcome')) s2Outcome = _rsUnpack(v.s2Outcome);
  if (has('s2Partial')) s2Partial = _rsUnpack(v.s2Partial);
  if (has('s2Answer')) s2Answer = _rsUnpack(v.s2Answer);
  if (has('s2View')) s2View = _rsUnpack(v.s2View);

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
    case 2: rsPaintDd({ done: s2Done, att: s2Attempts, lw: s2LastWrong, sel: s2Selected, out: s2Outcome, idx: S2_N, btn: s2Btn, markOne: s2MarkOne,
      results: function () { return s2Results(s2Selected); }, update: rsFn('s2UpdateCheck'), showPopup: rsFn('s2ShowPopup'), reopen: rsFn('s2ReopenPopup'), hint: 's2q-hint' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

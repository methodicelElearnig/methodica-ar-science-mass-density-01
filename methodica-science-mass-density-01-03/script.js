'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   הועתק מהמנוע המאומת של methodica-science-mass-density-01-01
   (סיין 1), ריק מתוכן פרטני של אותו סיין. TOTAL_SCREENS יעודכן
   ל-2+ עם הוספת כל מסך אמיתי (שלב זה: מסך placeholder יחיד).
   ========================================================= */

const TOTAL_SCREENS = 8;
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
  dndGhStopAll();
  if (n < 0 || n >= TOTAL_SCREENS) return;
  if (currentScreen === 1 && n !== 1) s1ClosePopups();
  if (currentScreen === 2 && n !== 2) s2qClosePopups();
  if (currentScreen === 3 && n !== 3) s3qClosePopups();
  if (currentScreen === 4 && n !== 4) s4ClosePopups();
  if (currentScreen === 6 && n !== 6) s6qClosePopups();
  if (currentScreen === 7 && n !== 7) s7ClosePopups();
  if (currentScreen === 5 && n !== 5) { const v5 = document.getElementById('s5-char-video'); if (v5) v5.pause(); }
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
  if (viaBack && n === 2 && s2qDone) s2qReopenPopup();
  if (viaBack && n === 3 && s3qDone) s3qReopenPopup();
  if (viaBack && n === 4 && s4Done) s4ReopenPopup();
  if (viaBack && n === 6 && s6qDone) s6qReopenPopup();
  if (viaBack && n === 7 && s7Done) s7ReopenPopup();
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
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
  if (n === 6) resetScreenState6();
  if (n === 7) resetScreenState7();
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
  if (currentScreen === 7 && !s7Done) return; // מסך 8: כנ"ל
  if (currentScreen === 6 && !s6qDone) return; // מסך 7: כנ"ל
  if (currentScreen === 4 && !s4Done) return; // מסך 5: כנ"ל
  if (currentScreen === 3 && !s3qDone) return; // מסך 4: כנ"ל
  if (currentScreen === 2 && !s2qDone) return; // מסך 3: כנ"ל
  if (currentScreen === 1 && !s1Done) return; // מסך 2: ההמשך נפתח רק אחרי שהשאלה נפתרה (resolved, לא correctness)
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') { s1CloseHint(); s2qCloseHint(); s3qCloseHint(); s4CloseHint(); s6qCloseHint(); s7CloseHint(); }
});

/* resetScreenState0() — מסך 1 (TransitionScreen, שקף 50): סטטי, אין state
   לסנכרן (מנגן את הדמות; יציאה באמצע → חזרה ממשיכה מאותה נקודה). */
function playS0Video() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
function resetScreenState0() { playS0Video(); }

/* resetScreenState5() — מסך 6 (TransitionScreen + בועה, שקף 55): מנגן את הדמות. */
function resetScreenState5() {
  const vid = document.getElementById('s5-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
playS0Video(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

function getAppScale() {
  const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

/* =========================================================
   Progress Question (720-templates → _global-components.md → "Progress Question"): 4 שאלות בסדרה;
   פריט ההתקדמות הוא שאלה, לא מסך. מסך 2 = שאלה 1. שאלות 2–4 עוד לא נבנו (screens ריק) —
   כשייבנו, יוסיפו כאן את מספרי המסכים ואת הסכמת התוצאה ב-progressItemResult.
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
  if (q.number === 2 && s2qDone) return s2qOutcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 3 && s3qDone) return s3qOutcome === 'correct' ? 'correct' : 'incorrect';
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

/* =========================================================
   מסך 2 (#s1) — DropdownQuestion, Single dropdown (שקף 51). שאלה 1 מתוך 4.
   • תשובה נכונה: "תכונה". 2 ניסיונות, רמז זמין מההתחלה (נשאר זמין עד שהשאלה נפתרת).
   • Retry gate: אחרי שגוי לא-סופי, "צדקתי?" כבוי עד שהבחירה שונה מזו שסומנה שגויה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   ========================================================= */
const S1_EXPLAIN = 'الكثافة هي <strong>خاصيّة</strong> مميزة للمادة.<br>قيمتها ثابتة بغض النظر عن حجم الجسم.';
const S1Q = { correctValue: 'خاصيّة', maxAttempts: 2 };
const S1_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: [S1_EXPLAIN] },
  wrong2:  {
    bg: '#ffdbdc', title: 'غير صحيح.<br>الإجابة الصحيحة معروضة.', body: [S1_EXPLAIN],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'غير صحيح‎.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};
const S1_CHECK_SVG = '<img class="dq-check-ico" src="../unit-assets/icons/icon-answerbox-check-green.svg" width="16" height="16" alt="">';
const S1_WRONG_SVG = '<img class="dq-wrong-ico" src="../unit-assets/icons/icon-answerbox-x-red.svg" width="16" height="16" alt="">';

let s1Selected = null;
let s1Attempts = 0;
let s1Done = false;       // שער ההמשך + נעילת החזרה-למסך (resolved, לא correctness)
let s1Outcome = null;     // 'correct' | 'wrong2'
let s1LastWrong = null;   // Retry gate — הבחירה שסומנה שגויה בניסיון הלא-סופי האחרון
let s1Answer = null;      // צילום בחירת הלומד בשגוי הסופי (לפני שהחשיפה דורסת אותה)
let s1View = 'solution';

function s1Btn() { return document.getElementById('dq-btn-1'); }
function s1List() { return document.getElementById('dq-list-1'); }
function s1Say(msg) { const el = document.getElementById('s1-live'); if (el) el.textContent = msg; }

function s1Open() {
  if (s1Done) return;
  s1DismissRetry(); // פתיחה/שינוי של הדרופדאון בזמן פופאפ-ביניים = פעולה מתקנת
  s1List().classList.remove('hidden');
  s1Btn().setAttribute('aria-expanded', 'true');
  s1List().querySelectorAll('.dq-option').forEach(function (o) {
    o.classList.toggle('is-selected', o.dataset.value === s1Selected);
  });
}
function s1Close() {
  const list = s1List(), btn = s1Btn();
  if (list) list.classList.add('hidden');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
function s1Toggle() {
  if (s1Done) return;
  if (s1List().classList.contains('hidden')) s1Open(); else s1Close();
}
function s1Select(value) {
  if (s1Done) return;
  s1DismissRetry();
  s1Selected = value;
  const btn = s1Btn();
  btn.removeAttribute('data-empty');
  document.getElementById('dq-selected-1').textContent = value;
  s1Close();
  btn.focus();
  s1Say('تم الاختيار: ' + value);
  s1UpdateCheck();
}
function s1UpdateCheck() {
  if (s1Done) return;
  const btn = document.getElementById('s1q-check');
  if (!btn) return;
  btn.disabled = s1Selected === null || (s1LastWrong !== null && s1Selected === s1LastWrong);
}
function s1DismissRetry() {
  if (s1Done) return;
  document.getElementById('s1q-popup')?.classList.add('hidden');
  s1ClearRetryMark();
}
/* שגוי לא-סופי: הכפתור מסומן באדום + ✗ (הבחירה השגויה), הנכון לא נחשף; הסימון נעלם בפעולה מתקנת (פתיחה/בחירה) */
function s1MarkRetry() {
  const btn = s1Btn();
  btn.classList.add('dq-wrong');
  btn.querySelector('.dq-wrong-ico')?.remove();
  btn.insertAdjacentHTML('beforeend', S1_WRONG_SVG);
}
function s1ClearRetryMark() {
  const btn = s1Btn();
  if (!btn || s1Done) return;
  btn.classList.remove('dq-wrong');
  btn.querySelector('.dq-wrong-ico')?.remove();
}

/* לחיצה מחוץ לדרופדאון סוגרת רשימה פתוחה; חיצים/Enter/Space במקלדת */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('.dq-dropdown-wrap')) return;
  s1Close();
});
document.addEventListener('keydown', function (e) {
  const opt = e.target.closest && e.target.closest('.dq-option');
  if (opt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); opt.click(); return; }
  if (opt && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    const sib = e.key === 'ArrowDown' ? opt.nextElementSibling : opt.previousElementSibling;
    if (sib) sib.focus();
    return;
  }
  const s4btn = e.target.closest && e.target.closest('#s4 .dq-btn');
  if (s4btn && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !s4Done) {
    e.preventDefault();
    const k = s4btn.id.slice(-1);
    s4Open(k);
    s4List(k).querySelector('.dq-option')?.focus();
  }
  if (e.key === 'Escape' && s4OpenIdx()) { const k = s4OpenIdx(); s4Close(); s4Btn(k)?.focus(); }
  const btn = s1Btn();
  if (btn && e.target === btn && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !s1Done) {
    e.preventDefault();
    s1Open();
    s1List().querySelector('.dq-option')?.focus();
  }
  if (e.key === 'Escape' && s1List() && !s1List().classList.contains('hidden')) { s1Close(); btn?.focus(); }
});

function s1Mark(state) {
  const btn = s1Btn(), sel = document.getElementById('dq-selected-1');
  btn.classList.remove('dq-correct', 'dq-wrong');
  btn.querySelector('.dq-check-ico')?.remove();
  btn.querySelector('.dq-wrong-ico')?.remove();
  if (state === 'answer') {
    sel.textContent = s1Answer;
    btn.classList.add('dq-wrong');
    btn.insertAdjacentHTML('beforeend', S1_WRONG_SVG);
  } else {
    if (state === 'solution') sel.textContent = S1Q.correctValue;
    btn.classList.add('dq-correct');
    btn.insertAdjacentHTML('beforeend', S1_CHECK_SVG);
  }
}

function s1Check() {
  if (s1Done) { advanceScreen(); return; }
  if (s1Selected === null) return;
  s1Close();
  s1Attempts++;
  /* xAPI: choice — the dropdown value IS the catalogue answer text. */
  xapiAnswered('001', 'q1', s1Selected === S1Q.correctValue, s1Selected === S1Q.correctValue || s1Attempts >= S1Q.maxAttempts, { choices: [s1Selected] });
  if (s1Selected === S1Q.correctValue) {
    s1Done = true;
    s1Outcome = 'correct';
    s1Btn().disabled = true;
    s1Mark('correct');
    s1ShowPopup('correct');
    s1Finish();
  } else if (s1Attempts >= S1Q.maxAttempts) {
    s1Done = true;
    s1Outcome = 'wrong2';
    s1Answer = s1Selected;
    s1View = 'solution';
    s1Btn().disabled = true;
    s1ApplyView();
    s1Finish();
  } else {
    s1LastWrong = s1Selected;
    s1MarkRetry();
    s1ShowPopup('retry');
    document.getElementById('s1q-check').disabled = true; // Retry gate
    s1Say('الإجابة غير صحيحة. هل نحاول مرة أخرى؟');
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

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s1ApplyView() {
  if (s1Answer === null) return;
  s1Mark(s1View === 'answer' ? 'answer' : 'solution');
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
function resetScreenState1() {
  syncPracticeProgressNav(document.getElementById('s1'));
  document.getElementById('s1q-popup')?.classList.add('hidden');
  s1CloseHint();
  s1Close();
  s1ClearRetryMark();
  if (s1Done) {
    s1Btn().disabled = true;
    if (s1Outcome === 'wrong2') { s1View = 'solution'; s1Mark('solution'); }
    else s1Mark('correct');
    const btn = document.getElementById('s1q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s1q-hint')?.classList.add('s3q-hint-done');
  }
}
function s1ReopenPopup() {
  if (s1Outcome === 'wrong2') { s1View = 'solution'; s1ApplyView(); }
  else if (s1Outcome) s1ShowPopup(s1Outcome);
}
function s1ClosePopups() {
  document.getElementById('s1q-popup')?.classList.add('hidden');
  s1CloseHint();
  s1Close();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s1OpenHint() {
  if (s1Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q1');
  s1Close();
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
   מסך 3 (#s2) — SingleChoiceQuestion בלי תמונה (שקף 52). שאלה 2 מתוך 4. לוגיקה כמו מסך 28 בסיין 1 (s27q*).
   correctId='a' (5 גרם/סמ"ק = 10 ÷ 2), 2 ניסיונות, רמז זמין מההתחלה. משוב ורמז — מילה במילה מהתסריט.
   אין תווית-המשך בתסריט → 'שנמשיך?' (ברירת-המחדל הקנונית). אין View My Answer Toggle (בחירה יחידה מציגה
   את הנבחרת השגויה ואת הנכונה יחד).
   ========================================================= */
const S2Q = { correctId: 'a', maxAttempts: 2 };
let s2qSelected = null;
let s2qAttempts = 0;
let s2qDone = false;
let s2qOutcome = null;     // 'correct' | 'wrong2'
let s2qLastWrong = null;   // Retry gate

const S2Q_EQ = '<span class="s2-eq" dir="ltr"><span class="s2-frac"><span>10</span><span class="s2-frac__line"></span><span>2</span></span><span>= 5</span></span>';
const S2Q_EXPLAIN = ['تُحسَب الكثافة بقسمة الكتلة على الحجم:', S2Q_EQ];
const S2Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S2Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2Q_EXPLAIN }
};

function s2qOptEl(id) { return document.querySelector('#s2 .s3q-opt[data-id="' + id + '"]'); }
function s2qSelect(id) {
  if (s2qDone) return;
  document.getElementById('s2q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s2 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s2qOptEl(id);
  if (!el) return;
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s2qSelected = id;
  const checkBtn = document.getElementById('s2q-check');
  if (checkBtn) checkBtn.disabled = (s2qLastWrong !== null && id === s2qLastWrong);
}
function s2qMark(id, cls) {
  const el = s2qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s2qShowPopup(type) {
  const cfg = S2Q_POPUP_CFG[type];
  const popup = document.getElementById('s2q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s2q-popup-title').innerHTML = cfg.title;
  document.getElementById('s2q-popup-body').innerHTML =
    cfg.body.map(function (p) { return p.charAt(0) === '<' ? p : '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s2qCheck() {
  if (s2qDone) { advanceScreen(); return; }
  if (!s2qSelected) return;
  s2qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('002', 'q1', s2qSelected === S2Q.correctId, s2qSelected === S2Q.correctId || s2qAttempts >= S2Q.maxAttempts, { choices: [xapiOptIdx(s2qSelected)] });
  if (s2qSelected === S2Q.correctId) {
    s2qMark(S2Q.correctId, 'correct');
    s2qShowPopup('correct');
    s2qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s2qAttempts < S2Q.maxAttempts) {
    s2qMark(s2qSelected, 'wrong');
    s2qLastWrong = s2qSelected;
    s2qShowPopup('retry');
    const checkBtn = document.getElementById('s2q-check');
    if (checkBtn) checkBtn.disabled = true; // Retry gate
  } else {
    s2qMark(s2qSelected, 'wrong');
    s2qMark(S2Q.correctId, 'correct');
    s2qShowPopup('wrong2');
    s2qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s2qFinish(outcome) {
  s2qDone = true;
  s2qOutcome = outcome;
  document.querySelectorAll('#s2 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.setAttribute('aria-disabled', 'true');
  });
  const checkBtn = document.getElementById('s2q-check');
  if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'متابعة'; }
  document.getElementById('s2q-hint')?.classList.add('s3q-hint-done');
  s2qCloseHint();
  syncPracticeProgressNav(document.getElementById('s2'));
}
/* כניסה למסך: מסך פתור חוזר נעול כמו שהיה; לא פתור — המצב נשמר כמו שהוא */
function resetScreenState2() {
  syncPracticeProgressNav(document.getElementById('s2'));
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2qCloseHint();
}
function s2qReopenPopup() { if (s2qOutcome) s2qShowPopup(s2qOutcome); }
function s2qClosePopups() {
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2qCloseHint();
}
function s2qOpenHint() {
  if (s2qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('002', 'q1');
  document.getElementById('s2q-hint-overlay')?.classList.remove('hidden');
}
function s2qCloseHint() { document.getElementById('s2q-hint-overlay')?.classList.add('hidden'); }
function s2qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s2qCloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s2qPopupDrag = null;
function s2qPopupDown(e) {
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
  s2qPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s2qPopupMove, { passive: false });
  document.addEventListener('pointerup', s2qPopupUp);
  document.addEventListener('pointercancel', s2qPopupUp);
  e.preventDefault();
}
function s2qPopupMove(e) {
  if (!s2qPopupDrag || e.pointerId !== s2qPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s2qPopupUp(e); return; }
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s2qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s2qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s2qPopupUp(e) {
  if (s2qPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s2qPopupDrag.id) return;
  s2qPopupDrag = null;
  document.removeEventListener('pointermove', s2qPopupMove);
  document.removeEventListener('pointerup', s2qPopupUp);
  document.removeEventListener('pointercancel', s2qPopupUp);
}

/* =========================================================
   מסך 4 (#s3) — שאלת בחירה על גרף (שקף 53). שאלה 3 מתוך 4. SingleChoiceQuestion, וריאנט מקומי: הקווים הם האפשרויות.
   correctId='d' (הקו התלול ביותר — 2.5 גרם לסמ"ק), 2 ניסיונות, רמז זמין מההתחלה. משוב ורמז — מילה במילה מהתסריט.
   אין תווית-המשך בתסריט → 'שנמשיך?' (ברירת-המחדל הקנונית). אין View My Answer Toggle (מציג את הנבחר השגוי ואת הנכון יחד).
   בחירה: לחיצה/הובר נפתרים לפי הקו הקרוב ביותר לנקודה (עד 18px בקואורדינטות הגרף) — קווים שמתחילים באותה ראשית
   לא "גונבים" זה מזה לחיצות; מקלדת: Tab לקו, Enter/רווח לבחירה, חיצים למעבר בין קווים.
   ========================================================= */
const S3Q = { correctId: 'd', maxAttempts: 2 };
const S3Q_GEO = { x0: 360, y0: 548, ux: 120, uy: 22, vmax: 5, hit: 18,
  slopes: { a: 0.5, b: 1, c: 2, d: 2.5 } }; // גרם לסמ"ק — תואם ל-build (סדרות הגרף בשקף 53)
let s3qSelected = null;
let s3qAttempts = 0;
let s3qDone = false;
let s3qOutcome = null;     // 'correct' | 'wrong2'
let s3qLastWrong = null;   // Retry gate

const S3Q_EXPLAIN = ['الخط الأكثر انحدارًا يمثل مادة ذات كثافة أعلى، لأنه يُظهر أن الكتلة تزداد كثيرًا حتى عند إضافة حجم قليل. أي أن <strong>هناك كتلة أكبر في كل وحدة حجم</strong>.'];
const S3Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا.', body: S3Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S3Q_EXPLAIN }
};

function s3qLineEl(id) { return document.getElementById('s3-line-' + id); }
function s3qAllLines() { return document.querySelectorAll('#s3 .s3-line'); }
function s3qSay(msg) { const el = document.getElementById('s3q-live'); if (el) el.textContent = msg; }

function s3qSelect(id) {
  if (s3qDone) return;
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3qAllLines().forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s3qLineEl(id);
  if (!el) return;
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s3qSelected = id;
  s3qSay(el.getAttribute('aria-label') + ' — تم الاختيار');
  const checkBtn = document.getElementById('s3q-check');
  if (checkBtn) checkBtn.disabled = (s3qLastWrong !== null && id === s3qLastWrong); // Retry gate
}
function s3qMark(id, cls) {
  const el = s3qLineEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
  el.parentNode.appendChild(el); // מעל שאר הקווים — ההילה והתג לא נחתכים בצומת הקווים
}
function s3qShowPopup(type) {
  const cfg = S3Q_POPUP_CFG[type];
  const popup = document.getElementById('s3q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s3q-popup-title').innerHTML = cfg.title;
  document.getElementById('s3q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s3qCheck() {
  if (s3qDone) { advanceScreen(); return; }
  if (!s3qSelected) return;
  s3qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('003', 'q1', s3qSelected === S3Q.correctId, s3qSelected === S3Q.correctId || s3qAttempts >= S3Q.maxAttempts, { choices: [xapiOptIdx(s3qSelected)] });
  if (s3qSelected === S3Q.correctId) {
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('correct');
    s3qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s3qAttempts < S3Q.maxAttempts) {
    s3qMark(s3qSelected, 'wrong');
    s3qLastWrong = s3qSelected;
    s3qShowPopup('retry');
    s3qSay('الإجابة غير صحيحة. هل نحاول مرة أخرى؟');
    const checkBtn = document.getElementById('s3q-check');
    if (checkBtn) checkBtn.disabled = true; // Retry gate
  } else {
    s3qMark(s3qSelected, 'wrong');
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('wrong2');
    s3qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s3qFinish(outcome) {
  s3qDone = true;
  s3qOutcome = outcome;
  s3qAllLines().forEach(function (el) {
    el.classList.remove('is-hover');
    el.setAttribute('aria-disabled', 'true');
    el.setAttribute('tabindex', '-1');
  });
  const svg = document.getElementById('s3q-svg');
  if (svg) { svg.classList.remove('is-near'); svg.classList.add('is-locked'); }
  const checkBtn = document.getElementById('s3q-check');
  if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'متابعة'; }
  document.getElementById('s3q-hint')?.classList.add('s3q-hint-done');
  s3qCloseHint();
  syncPracticeProgressNav(document.getElementById('s3'));
}

/* ---------- בחירת קו לפי קרבה (עכבר / מגע) ---------- */
function s3qPoint(e) {
  const svg = document.getElementById('s3q-svg');
  const pt = svg.createSVGPoint();
  pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}
function s3qNearest(p) { // הקו הקרוב ביותר (מרחק לקטע מהראשית לקצה) בטווח ה-hit, או null
  const g = S3Q_GEO;
  let best = null, bestD = g.hit;
  Object.keys(g.slopes).forEach(function (id) {
    const ex = g.x0 + g.vmax * g.ux, ey = g.y0 - g.slopes[id] * g.vmax * g.uy;
    const dx = ex - g.x0, dy = ey - g.y0;
    const t = Math.max(0, Math.min(1, ((p.x - g.x0) * dx + (p.y - g.y0) * dy) / (dx * dx + dy * dy)));
    const d = Math.hypot(p.x - (g.x0 + t * dx), p.y - (g.y0 + t * dy));
    if (d < bestD) { bestD = d; best = id; }
  });
  return best;
}
function s3qSetHover(id) {
  s3qAllLines().forEach(function (el) { el.classList.toggle('is-hover', !s3qDone && el.dataset.id === id); });
  document.getElementById('s3q-svg')?.classList.toggle('is-near', !s3qDone && id !== null);
}
function s3qInitPointer() {
  const svg = document.getElementById('s3q-svg');
  if (!svg || svg.dataset.bound) return;
  svg.dataset.bound = '1';
  svg.addEventListener('pointermove', function (e) { if (!s3qDone && e.pointerType !== 'touch') s3qSetHover(s3qNearest(s3qPoint(e))); });
  svg.addEventListener('pointerleave', function () { s3qSetHover(null); });
  svg.addEventListener('click', function (e) {
    if (s3qDone) return;
    const id = s3qNearest(s3qPoint(e));
    if (id) s3qSelect(id);
  });
  svg.addEventListener('keydown', function (e) {
    const line = e.target.closest && e.target.closest('.s3-line');
    if (!line || s3qDone) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); s3qSelect(line.dataset.id); return; }
    const ids = Object.keys(S3Q_GEO.slopes);
    const i = ids.indexOf(line.dataset.id);
    const step = (e.key === 'ArrowUp' || e.key === 'ArrowRight') ? 1 : (e.key === 'ArrowDown' || e.key === 'ArrowLeft') ? -1 : 0;
    if (step) { e.preventDefault(); s3qLineEl(ids[(i + step + ids.length) % ids.length])?.focus(); }
  });
}
s3qInitPointer();

/* כניסה למסך: מסך פתור חוזר נעול כמו שהיה; לא פתור — המצב נשמר כמו שהוא */
function resetScreenState3() {
  syncPracticeProgressNav(document.getElementById('s3'));
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3qCloseHint();
  s3qSetHover(null);
}
function s3qReopenPopup() { if (s3qOutcome) s3qShowPopup(s3qOutcome); }
function s3qClosePopups() {
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3qCloseHint();
  s3qSetHover(null);
}
function s3qOpenHint() {
  if (s3qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s3q-hint-overlay')?.classList.remove('hidden');
}
function s3qCloseHint() { document.getElementById('s3q-hint-overlay')?.classList.add('hidden'); }
function s3qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s3qCloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s3qPopupDrag = null;
function s3qPopupDown(e) {
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
  s3qPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s3qPopupMove, { passive: false });
  document.addEventListener('pointerup', s3qPopupUp);
  document.addEventListener('pointercancel', s3qPopupUp);
  e.preventDefault();
}
function s3qPopupMove(e) {
  if (!s3qPopupDrag || e.pointerId !== s3qPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s3qPopupUp(e); return; }
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s3qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s3qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s3qPopupUp(e) {
  if (s3qPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s3qPopupDrag.id) return;
  s3qPopupDrag = null;
  document.removeEventListener('pointermove', s3qPopupMove);
  document.removeEventListener('pointerup', s3qPopupUp);
  document.removeEventListener('pointercancel', s3qPopupUp);
}


/* =========================================================
   מסך 5 (#s4) — DropdownQuestion × 2 משפטי השלמה (שקף 54). שאלה 4 מתוך 4. לוגיקה כמו מסך 2 (s1*), לשני דרופדאונים.
   • נכון: משפט 1 = "1", משפט 2 = "ישקע". נכון רק כששניהם נכונים. 2 ניסיונות (משותפים), רמז זמין מההתחלה.
   • שגוי לא-סופי: הדרופדאון הנכון מסומן בירוק (✓) והשגוי באדום (✗); הערך הנכון של השגוי לא נחשף. Retry gate: "צדקתי?" כבוי עד ששגוי אחד לפחות שונה.
   • שגוי סופי: הפתרון מוצג + View My Answer Toggle; חזרה למסך פתור — תמיד בתצוגת הפתרון.
   ========================================================= */
const S4_EXPLAIN = ['كثافة الماء هي 1 غرام/سم³.', 'المادة التي تكون كثافتها أعلى من 1، سوف تغرق في الماء.'];
const S4Q = { correct: { 1: '1', 2: 'يغرق' }, maxAttempts: 2 };
const S4_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S4_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

let s4Selected = { 1: null, 2: null };
let s4LastWrong = { 1: null, 2: null }; // Retry gate — הבחירות שסומנו שגויות בניסיון הלא-סופי האחרון
let s4Attempts = 0;
let s4Done = false;
let s4Outcome = null;     // 'correct' | 'wrong2'
let s4Partial = false;    // דרופדאון אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s4Answer = null;      // צילום בחירות הלומד בשגוי הסופי
let s4View = 'solution';

function s4Btn(i) { return document.getElementById('dq-btn-4' + i); }
function s4List(i) { return document.getElementById('dq-list-4' + i); }
function s4Say(msg) { const el = document.getElementById('s4-live'); if (el) el.textContent = msg; }
function s4OpenIdx() { return [1, 2].find(function (i) { const l = s4List(i); return l && !l.classList.contains('hidden'); }) || null; }

function s4Open(i) {
  if (s4Done) return;
  s4Close();
  s4DismissRetry();
  s4List(i).classList.remove('hidden');
  s4Btn(i).setAttribute('aria-expanded', 'true');
  s4List(i).querySelectorAll('.dq-option').forEach(function (o) {
    o.classList.toggle('is-selected', o.dataset.value === s4Selected[i]);
  });
}
function s4Close() {
  [1, 2].forEach(function (i) {
    const list = s4List(i), btn = s4Btn(i);
    if (list) list.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}
function s4Toggle(i) {
  if (s4Done) return;
  if (s4List(i).classList.contains('hidden')) s4Open(i); else s4Close();
}
function s4Select(i, value) {
  if (s4Done) return;
  s4DismissRetry();
  s4Selected[i] = value;
  s4ClearMark(i); // בחירה חדשה מבטלת את החיווי הקודם של אותו דרופדאון
  const btn = s4Btn(i);
  btn.removeAttribute('data-empty');
  document.getElementById('dq-selected-4' + i).textContent = value;
  s4Close();
  btn.focus();
  s4Say('تم الاختيار: ' + value);
  s4UpdateCheck();
}
function s4UpdateCheck() {
  if (s4Done) return;
  const btn = document.getElementById('s4q-check');
  if (!btn) return;
  const filled = s4Selected[1] !== null && s4Selected[2] !== null;
  const hadRetry = s4LastWrong[1] !== null || s4LastWrong[2] !== null;
  const changed = [1, 2].some(function (i) { return s4LastWrong[i] !== null && s4Selected[i] !== s4LastWrong[i]; });
  btn.disabled = !filled || (hadRetry && !changed);
}
function s4DismissRetry() {
  if (s4Done) return;
  document.getElementById('s4q-popup')?.classList.add('hidden');
  [1, 2].forEach(function (i) { if (s4LastWrong[i] !== null) s4ClearMark(i); }); // הנכון נשאר ירוק עד לבדיקה הבאה
}
function s4ClearMark(i) {
  const btn = s4Btn(i);
  if (!btn) return;
  btn.classList.remove('dq-correct', 'dq-wrong');
  btn.querySelector('.dq-check-ico')?.remove();
  btn.querySelector('.dq-wrong-ico')?.remove();
}
function s4MarkOne(i, ok) {
  const btn = s4Btn(i);
  s4ClearMark(i);
  btn.classList.add(ok ? 'dq-correct' : 'dq-wrong');
  btn.insertAdjacentHTML('beforeend', ok ? S1_CHECK_SVG : S1_WRONG_SVG);
}
function s4IsRight(i, v) { return v === S4Q.correct[i]; }

/* לחיצה מחוץ לדרופדאון סוגרת רשימה פתוחה */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('#s4 .dq-dropdown-wrap')) return;
  s4Close();
});

function s4Check() {
  if (s4Done) { advanceScreen(); return; }
  if (s4Selected[1] === null || s4Selected[2] === null) return;
  s4Close();
  s4Attempts++;
  const ok1 = s4IsRight(1, s4Selected[1]), ok2 = s4IsRight(2, s4Selected[2]);
  s4Partial = ok1 !== ok2;
  /* xAPI: performance — the two dropdown values in steps order (water density, behaviour at 2.3). */
  xapiAnswered('004', 'q1', ok1 && ok2, (ok1 && ok2) || s4Attempts >= S4Q.maxAttempts, { steps: [s4Selected[1], s4Selected[2]] });
  if (ok1 && ok2) {
    s4Done = true;
    s4Outcome = 'correct';
    s4Lock();
    s4MarkOne(1, true); s4MarkOne(2, true);
    s4ShowPopup('correct');
    s4Finish();
  } else if (s4Attempts >= S4Q.maxAttempts) {
    s4Done = true;
    s4Outcome = 'wrong2';
    s4Answer = { 1: s4Selected[1], 2: s4Selected[2] };
    s4View = 'solution';
    s4Lock();
    s4ApplyView();
    s4Finish();
  } else {
    s4LastWrong = { 1: ok1 ? null : s4Selected[1], 2: ok2 ? null : s4Selected[2] };
    s4MarkOne(1, ok1);
    s4MarkOne(2, ok2);
    s4ShowPopup('retry');
    document.getElementById('s4q-check').disabled = true; // Retry gate
    s4Say((s4Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'هل نحاول مرة أخرى؟');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s4Lock() { s4Btn(1).disabled = true; s4Btn(2).disabled = true; }
function s4Finish() {
  const btn = document.getElementById('s4q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s4q-hint')?.classList.add('s3q-hint-done');
  s4CloseHint();
  syncPracticeProgressNav(document.getElementById('s4'));
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s4ApplyView() {
  if (s4Answer === null) return;
  [1, 2].forEach(function (i) {
    const sel = document.getElementById('dq-selected-4' + i);
    if (s4View === 'answer') {
      sel.textContent = s4Answer[i];
      s4MarkOne(i, s4IsRight(i, s4Answer[i]));
    } else {
      sel.textContent = S4Q.correct[i];
      s4MarkOne(i, true);
    }
  });
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
  if (s4Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s4Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
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
function resetScreenState4() {
  syncPracticeProgressNav(document.getElementById('s4'));
  document.getElementById('s4q-popup')?.classList.add('hidden');
  s4CloseHint();
  s4Close();
  if (!s4Done) return; // החיווי של ניסיון לא-סופי נשמר כמו שהוא
  s4Lock();
  [1, 2].forEach(function (i) {
    document.getElementById('dq-selected-4' + i).textContent = S4Q.correct[i];
    s4MarkOne(i, true);
  });
  s4View = 'solution';
  const btn = document.getElementById('s4q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
  document.getElementById('s4q-hint')?.classList.add('s3q-hint-done');
}
function s4ReopenPopup() {
  if (s4Outcome === 'wrong2') { s4View = 'solution'; s4ApplyView(); }
  else if (s4Outcome) s4ShowPopup(s4Outcome);
}
function s4ClosePopups() {
  document.getElementById('s4q-popup')?.classList.add('hidden');
  s4CloseHint();
  s4Close();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s4OpenHint() {
  if (s4Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  s4Close();
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

/* =========================================================
   מסך 7 (#s6) — SingleChoiceQuestionImage (שקף 56). שאלה 1 מתוך 2 (סדרה ב'). רפרנס: מסך 9 בסיין 1 (s8) + לוגיקת s2q.
   correctId='b' (2.70 גרם/סמ"ק — אלומיניום; 270 ÷ 100 = 2.7), 2 ניסיונות (התסריט שותק), רמז זמין מההתחלה.
   משוב ורמז — מילה במילה מהתסריט. אין תווית-המשך בתסריט → 'שנמשיך?'. סרגל התקדמות נפרד: 2 שאלות (practiceProgress2).
   ========================================================= */
const S6Q = { correctId: 'b', maxAttempts: 2 };
let s6qSelected = null;
let s6qAttempts = 0;
let s6qDone = false;
let s6qOutcome = null;     // 'correct' | 'wrong2'
let s6qLastWrong = null;   // Retry gate

const S6Q_EQ = '<span class="s2-eq" dir="ltr"><span class="s2-frac"><span>270</span><span class="s2-frac__line"></span><span>100</span></span><span>= 2.7</span></span>';
const S6Q_EXPLAIN = ['سنحسب هكذا:', S6Q_EQ, 'وفقًا للجدول، تتناسب هذه الكثافة مع الألومنيوم.'];
const S6Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز!', body: S6Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S6Q_EXPLAIN }
};

function s6qOptEl(id) { return document.querySelector('#s6 .s3q-opt[data-id="' + id + '"]'); }
function s6qSelect(id) {
  if (s6qDone) return;
  document.getElementById('s6q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s6 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s6qOptEl(id);
  if (!el) return;
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s6qSelected = id;
  const checkBtn = document.getElementById('s6q-check');
  if (checkBtn) checkBtn.disabled = (s6qLastWrong !== null && id === s6qLastWrong);
}
function s6qMark(id, cls) {
  const el = s6qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s6qShowPopup(type) {
  const cfg = S6Q_POPUP_CFG[type];
  const popup = document.getElementById('s6q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s6q-popup-title').innerHTML = cfg.title;
  document.getElementById('s6q-popup-body').innerHTML =
    cfg.body.map(function (p) { return p.charAt(0) === '<' ? p : '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s6qCheck() {
  if (s6qDone) { advanceScreen(); return; }
  if (!s6qSelected) return;
  s6qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('005', 'q1', s6qSelected === S6Q.correctId, s6qSelected === S6Q.correctId || s6qAttempts >= S6Q.maxAttempts, { choices: [xapiOptIdx(s6qSelected)] });
  if (s6qSelected === S6Q.correctId) {
    s6qMark(S6Q.correctId, 'correct');
    s6qShowPopup('correct');
    s6qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s6qAttempts < S6Q.maxAttempts) {
    s6qMark(s6qSelected, 'wrong');
    s6qLastWrong = s6qSelected;
    s6qShowPopup('retry');
    const checkBtn = document.getElementById('s6q-check');
    if (checkBtn) checkBtn.disabled = true; // Retry gate
  } else {
    s6qMark(s6qSelected, 'wrong');
    s6qMark(S6Q.correctId, 'correct');
    s6qShowPopup('wrong2');
    s6qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s6qFinish(outcome) {
  s6qDone = true;
  s6qOutcome = outcome;
  document.querySelectorAll('#s6 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.setAttribute('aria-disabled', 'true');
  });
  const checkBtn = document.getElementById('s6q-check');
  if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'متابعة'; }
  document.getElementById('s6q-hint')?.classList.add('s3q-hint-done');
  s6qCloseHint();
  syncPracticeProgress2Nav();
}
/* כניסה למסך: מסך פתור חוזר נעול כמו שהיה; לא פתור — המצב נשמר כמו שהוא */
function resetScreenState6() {
  syncPracticeProgress2Nav();
  document.getElementById('s6q-popup')?.classList.add('hidden');
  s6qCloseHint();
}
function s6qReopenPopup() { if (s6qOutcome) s6qShowPopup(s6qOutcome); }
function s6qClosePopups() {
  document.getElementById('s6q-popup')?.classList.add('hidden');
  s6qCloseHint();
}
function s6qOpenHint() {
  if (s6qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('005', 'q1');
  document.getElementById('s6q-hint-overlay')?.classList.remove('hidden');
}
function s6qCloseHint() { document.getElementById('s6q-hint-overlay')?.classList.add('hidden'); }
function s6qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s6qCloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s6qPopupDrag = null;
function s6qPopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s6q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s6qPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s6qPopupMove, { passive: false });
  document.addEventListener('pointerup', s6qPopupUp);
  document.addEventListener('pointercancel', s6qPopupUp);
  e.preventDefault();
}
function s6qPopupMove(e) {
  if (!s6qPopupDrag || e.pointerId !== s6qPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s6qPopupUp(e); return; }
  const popup = document.getElementById('s6q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s6qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s6qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s6qPopupUp(e) {
  if (s6qPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s6qPopupDrag.id) return;
  s6qPopupDrag = null;
  document.removeEventListener('pointermove', s6qPopupMove);
  document.removeEventListener('pointerup', s6qPopupUp);
  document.removeEventListener('pointercancel', s6qPopupUp);
}

/* סרגל התקדמות של סדרה ב' (שאלה 2 מתוך 2): מסך 7 = שאלה 1; מסך 8 = שאלה 2. */
const practiceProgress2 = {
  questions: [
    { number: 1, screens: [6], result: function () { return s6qDone ? (s6qOutcome === 'correct' ? 'correct' : 'incorrect') : null; } },
    { number: 2, screens: [7], result: function () { return s7Done ? (s7Outcome === 'correct' ? 'correct' : 'incorrect') : null; } }
  ]
};
function syncPracticeProgress2Nav() {
  ['#s6', '#s7'].forEach(function (id) {
    const nav = document.querySelector(id + ' .progress-question');
    if (nav) updateProgressQuestion(nav, practiceProgress2);
  });
}


/* =========================================================
   Image Zoom Popup — מודול חוזר. לפי 720-templates → _global-components.md
   → "Image zoom" (מקור האמת להתנהגות) + 720-design-guidelines → "Image Zoom
   Surface" / "Shared popup backdrop": הפופאפ **ממורכז במסך** מעל רקע לבן 80%
   (אח של המשטח, לא ילד שלו), בתוך #app (מערכת-קואורדינטות של הקנבס, ללא
   חישובי viewport). המשטח: לבן, רדיוס 24, בלי מסגרת/צל, ריפוד 64/24/24/24,
   מעטפת מקסימלית 1200x640; אזור-המדיה ברדיוס 16, בגודל לפי יחס-הצדדים של
   התוכן (מוגדל — לא מוגבל ל-x1). סגירה: X (שמאל-עליון 16/16), לחיצה על הרקע,
   Escape. מקור מורכב (גרף) מוצג כשכפול חי עם transform אחיד אחד.
   לחיצה על התמונה / המסגרת / העדשה פותחת. אידמפוטנטי.
   ========================================================= */
(function initMethodicaImageZoomPopupModule() {
  if (window.__methodicaImageZoomPopupModule) {
    window.__methodicaImageZoomPopupModule.initImages(document);
    return;
  }
  /* [data-zoom-source] = אלמנט מורכב (גרף: תמונה + שכבת SVG/נקודות) — מוצג בפופאפ כשכפול חי של מצבו הנוכחי */
  const IMAGE_SELECTOR = 'img.zoomable-image, [data-zoomable-image], [data-zoom-source]';
  const FRAME_SELECTOR = '.methodica-image-zoom-frame';
  
  /* התמונה ממלאת את כל המשטח (בלי ריפוד חיצוני) — Figma 2197:11866 / 2197:11979 */
  const MAX_SURFACE_W = 1200, MAX_SURFACE_H = 640;
  const PAD_TOP = 0, PAD_SIDE = 0, PAD_BOTTOM = 0;
  let activeImage = null;

  function imageFromTarget(target) {
    if (!target || !target.closest) return null;
    const trigger = target.closest('.methodica-image-zoom-trigger');
    if (trigger) {
      const f = trigger.closest(FRAME_SELECTOR);
      return f ? sourceOf(f) : null;
    }
    const direct = target.closest(IMAGE_SELECTOR);
    if (direct) return direct;
    const frame = target.closest(FRAME_SELECTOR);
    return frame ? sourceOf(frame) : null;
  }
  function sourceOf(frame) {
    return frame.matches(IMAGE_SELECTOR) ? frame : frame.querySelector(IMAGE_SELECTOR);
  }

  function ensurePopup() {
    let popup = document.querySelector('.methodica-image-zoom-popup');
    if (popup) return popup;
    popup = document.createElement('div');
    popup.className = 'methodica-image-zoom-popup';
    popup.setAttribute('role', 'dialog');
    popup.setAttribute('aria-modal', 'true');
    popup.setAttribute('aria-label', 'صورة مكبرة');
    popup.innerHTML =
      '<div class="methodica-image-zoom-backdrop" data-zoom-close="true"></div>' +
      '<div class="methodica-image-zoom-surface">' +
        '<button type="button" class="methodica-image-zoom-close" data-zoom-close="true" aria-label="إغلاق تكبير الصورة"></button>' +
        '<div class="methodica-image-zoom-media">' +
          '<img class="methodica-image-zoom-popup-img" alt="">' +
          '<div class="methodica-image-zoom-popup-clone" hidden></div>' +
        '</div>' +
      '</div>';
    (document.getElementById('app') || document.body).appendChild(popup);
    return popup;
  }

  function addMagnifier(image) {
    const frame = image.closest(FRAME_SELECTOR);
    if (!frame || frame.querySelector('.methodica-image-zoom-trigger')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'methodica-image-zoom-trigger';
    button.setAttribute('aria-label', 'تكبير الصورة');
    /* העדשה יושבת בתוך מסגרת-התמונה הפנימית (top/right 10), כמו ביעד 3 */
    (image.closest('.s8-img-frame, .s6-img-frame, .qimg-frame') || frame).appendChild(button);
  }

  /* גודל אזור-המדיה: מתאים את התוכן (baseW x baseH) לאזור-המדיה המרבי תוך שמירה
     על יחס-הצדדים, כולל הגדלה מעבר לגודל המקורי; המשטח = מדיה + ריפוד, ממורכז
     בקנבס (גודל הקנבס בפיקסלי-פריסה — לא getBoundingClientRect). */
  function layoutSurface(popup, baseW, baseH) {
    const canvas = getCanvasSize();
    const maxMediaW = Math.min(MAX_SURFACE_W, canvas.w) - PAD_SIDE * 2;
    const maxMediaH = Math.min(MAX_SURFACE_H, canvas.h) - PAD_TOP - PAD_BOTTOM;
    const k = Math.min(maxMediaW / baseW, maxMediaH / baseH);
    const mediaW = Math.round(baseW * k), mediaH = Math.round(baseH * k);
    const surface = popup.querySelector('.methodica-image-zoom-surface');
    const w = mediaW + PAD_SIDE * 2, h = mediaH + PAD_TOP + PAD_BOTTOM;
    surface.style.width = w + 'px';
    surface.style.height = h + 'px';
    surface.style.left = Math.round((canvas.w - w) / 2) + 'px';
    surface.style.top = Math.round((canvas.h - h) / 2) + 'px';
    return k;
  }

  /* מקור מורכב (גרף): שכפול חי של המסגרת בגודל-הפריסה המקורי + transform אחיד
     אחד, כך שהתמונה/התוויות/הקווים נשארים צמודים. מזהים ואנימציות-כניסה מוסרים. */
  function openComposite(src, popup) {
    const baseW = src.offsetWidth, baseH = src.offsetHeight;
    if (!baseW || !baseH) return;
    const k = layoutSurface(popup, baseW, baseH);
    const holder = popup.querySelector('.methodica-image-zoom-popup-clone');
    const clone = src.cloneNode(true);
    clone.removeAttribute('id');
    clone.removeAttribute('data-zoom-source');
    clone.removeAttribute('data-reveal');
    clone.classList.remove('methodica-image-zoom-frame');
    clone.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
    clone.querySelectorAll('.methodica-image-zoom-trigger').forEach(function (n) { n.remove(); });
    clone.querySelectorAll('.is-new').forEach(function (n) { n.classList.remove('is-new'); });
    clone.classList.remove('is-new');
    clone.style.cssText += ';position:absolute;left:0;top:0;right:auto;bottom:auto;margin:0;border:none;border-radius:0;opacity:1;visibility:visible;animation:none;' +
      'width:' + baseW + 'px;height:' + baseH + 'px;transform-origin:0 0;transform:scale(' + k + ');pointer-events:none';
    holder.innerHTML = '';
    holder.appendChild(clone);
    holder.hidden = false;
    popup.querySelector('.methodica-image-zoom-popup-img').style.display = 'none';
    popup.classList.add('is-open');
  }

  function openPopup(image) {
    if (!image) return;
    const popup = ensurePopup();
    if (image.tagName !== 'IMG') {
      activeImage = image;
      openComposite(image, popup);
      return;
    }
    if (!image.src) return;
    activeImage = image;
    const img = popup.querySelector('.methodica-image-zoom-popup-img');
    const holder = popup.querySelector('.methodica-image-zoom-popup-clone');
    holder.hidden = true;
    holder.innerHTML = '';
    img.style.display = '';
    img.src = image.currentSrc || image.src;
    img.alt = image.alt || '';
    layoutSurface(popup, image.naturalWidth || image.offsetWidth || 1, image.naturalHeight || image.offsetHeight || 1);
    popup.classList.add('is-open');
  }

  function closePopup() {
    const popup = document.querySelector('.methodica-image-zoom-popup');
    if (popup) {
      popup.classList.remove('is-open');
      const holder = popup.querySelector('.methodica-image-zoom-popup-clone');
      if (holder) holder.innerHTML = '';
    }
    activeImage = null;
  }

  function initImages(root) {
    (root || document).querySelectorAll(IMAGE_SELECTOR).forEach(addMagnifier);
  }

  document.addEventListener('click', function (e) {
    const t = e.target;
    if (t.closest && t.closest('[data-zoom-close="true"]')) {
      e.preventDefault();
      closePopup();
      return;
    }
    if (t.closest && t.closest('.methodica-image-zoom-popup')) return;
    const image = imageFromTarget(t);
    if (!image) return;
    e.preventDefault();
    openPopup(image);
  }, true);
  window.addEventListener('resize', function () { if (activeImage) openPopup(activeImage); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && activeImage) closePopup();
  });

  window.__methodicaImageZoomPopupModule = { initImages: initImages, openPopup: openPopup, closePopup: closePopup };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initImages(document); }, { once: true });
  } else {
    initImages(document);
  }
})();


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
    a.ghost.style.left = (e.clientX - a.offX) + 'px';
    a.ghost.style.top = (e.clientY - a.offY) + 'px';
    const hit = targetUnder(e.clientX, e.clientY);
    const hitId = hit ? hit.id : null;
    if (a.currentTarget !== hitId) {
      targets.forEach(function (tid, elem) { elem.classList.toggle('drag-over', tid === hitId); });
      a.currentTarget = hitId;
    }
  }

  function onUp(e) {
    if (!active || (e && e.pointerId !== undefined && e.pointerId !== active.pointerId)) return;
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointercancel', onUp);
    const a = active;
    active = null;
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
   מסך 8 (#s7) — DragAndDropQuestion טקסטואלית + גרף מלווה (שקף 57). שאלה 2 מתוך 2 (סדרה ב').
   מפתח: חלל 1 = "גדולה" (צפיפות הגולה גדולה מצפיפות הנוזל), חלל 2 = "תלול" (קו תלול = צפיפות גדולה יותר); "מתון" = מסיח.
   • כל מילה יכולה להיגרר לכל חלל; חלל מחזיק מילה אחת (מילה שנגררת לחלל תפוס מפנה את הדייר חזרה למחסן).
   • בדיקה נפתחת כששני החללים מלאים. 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • פתרון חלקי: חלל אחד נכון מתוך שניים → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   • Retry gate: אחרי שגוי לא-סופי "צדקתי?" כבוי עד שההנחה שונה בפועל מההנחה השגויה האחרונה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על מילה בוחרת אותה, הקשה/Enter על חלל מניחה, הקשה על המחסן מחזירה.
   ========================================================= */
const S7 = {
  order: ['mild', 'big', 'steep'],
  zones: ['t1', 't2'],
  correct: { t1: 'big', t2: 'steep' },           // חלל → מילה
  zoneName: { t1: 'الأول', t2: 'الثاني' },
  maxAttempts: 2
};
const S7_EXPLAIN = ['الكرة غرقت لأن كثافتها أكبر من كثافة السائل. لذلك الخط الحاد (شديد الانحدار) ينتمي إلى الكرة، والخط المعتدل ينتمي إلى السائل.'];
const S7_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S7_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S7_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const s7Placement = {};       // wordId → 'source' | 't1' | 't2'
S7.order.forEach(function (id) { s7Placement[id] = 'source'; });
let s7Marks = {};             // wordId → 'correct' | 'wrong' (אחרי בדיקה)
let s7Selected = null;        // מילה שנבחרה בהקשה/מקלדת
let s7Attempts = 0;
let s7Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s7Outcome = null;         // 'correct' | 'wrong2'
let s7LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s7Partial = false;        // חלל אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s7Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s7View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s7Dnd = null;

function s7Occupant(zone, except) {
  return S7.order.find(function (id) { return id !== except && s7Placement[id] === zone; }) || null;
}
function s7Snapshot() { return JSON.stringify(S7.zones.map(function (z) { return s7Occupant(z, null); })); }
function s7AllFilled() { return S7.zones.every(function (z) { return s7Occupant(z, null) !== null; }); }
function s7Say(msg) { const el = document.getElementById('s7-live'); if (el) el.textContent = msg; }
function s7WordLabel(id) { return document.querySelector('#s7-d-' + id + ' .s7-card__text').textContent; }
function s7IsRight(z) { return s7Occupant(z, null) === S7.correct[z]; }
/* הנחת מילה בחלל; אם החלל תפוס — הדייר מוחזר למחסן */
function s7Place(id, zone) {
  const occ = s7Occupant(zone, id);
  if (occ) s7Placement[occ] = 'source';
  s7Placement[id] = zone;
  s7Say(s7WordLabel(id) + ' وُضِعَت في الفراغ ' + S7.zoneName[zone]);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s7DismissRetry() {
  if (s7Done) return;
  s7Marks = {};
  document.getElementById('s7q-popup')?.classList.add('hidden');
}

function s7Render() {
  S7.order.forEach(function (id) {
    const src = document.getElementById('s7-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s7Placement[id] !== 'source');
    src.classList.toggle('is-locked', s7Done);
    const sel = s7Selected === id;
    src.classList.toggle('is-selected', sel && s7Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s7Done ? 'true' : 'false');
    src.setAttribute('tabindex', s7Placement[id] === 'source' ? '0' : '-1');
  });
  S7.zones.forEach(function (z) {
    const zone = document.getElementById('s7-zone-' + z);
    zone.querySelectorAll('.s7-card').forEach(function (c) { c.remove(); });
    const id = s7Occupant(z, null);
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s7Done);
    zone.classList.remove('is-correct', 'is-wrong');
    if (!id) return;
    const chip = document.createElement('div');
    chip.className = 's7-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
    icon.className = 's7-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 's7-card__text';
    text.textContent = s7WordLabel(id);
    chip.appendChild(icon);
    chip.appendChild(text);
    chip.classList.toggle('is-selected', s7Selected === id);
    chip.classList.toggle('is-locked', s7Done);
    chip.setAttribute('aria-pressed', s7Selected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', s7WordLabel(id) + ' — في الفراغ ' + S7.zoneName[z] +
      (s7Marks[id] === 'correct' ? '، صحيح' : s7Marks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (s7Marks[id]) {
      const cls = s7Marks[id] === 'correct' ? 'is-correct' : 'is-wrong';
      chip.classList.add(cls);
      zone.classList.add(cls);
    }
    zone.appendChild(chip);
    if (!s7Done && s7Dnd) s7Dnd.attachSource(chip, id);
    chip.addEventListener('keydown', s7CardKey);
  });
  s7UpdateCheck();
}

function s7UpdateCheck() {
  if (s7Done) return;
  const btn = document.getElementById('s7q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s7AllFilled() || (s7LastWrong !== null && s7Snapshot() === s7LastWrong);
}

function s7InitDnd() {
  if (s7Dnd) return;
  s7Dnd = createPointerDnd({
    canDrag: function () { return !s7Done; },
    onPick: function (id) {
      dndGhStop('s7', true);
      s7DismissRetry();
      s7Selected = null;
      if (s7Placement[id] !== 'source') s7Placement[id] = 'source';
      s7Render();
      document.getElementById('s7-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s7Place(id, zone); s7Render(); },
    onCancel: function () { s7Render(); },
    onTap: function (id) { s7Tap(id); }
  });
  S7.order.forEach(function (id) {
    const el = document.getElementById('s7-d-' + id);
    s7Dnd.attachSource(el, id);
    el.addEventListener('keydown', s7CardKey);
  });
  S7.zones.forEach(function (z) { s7Dnd.attachTarget(document.getElementById('s7-zone-' + z), z); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על חלל */
function s7Tap(id) {
  dndGhStop('s7', true);
  if (s7Done) return;
  s7DismissRetry();
  /* יש מילה נבחרת והלומד הקיש על מילה שכבר מונחת בחלל → זו הנחה באותו חלל */
  if (s7Selected && s7Selected !== id && s7Placement[id] !== 'source') {
    const moved = s7Selected;
    s7Selected = null;
    s7Place(moved, s7Placement[id]);
    s7Render();
    return;
  }
  s7Selected = (s7Selected === id) ? null : id;
  s7Say(s7Selected ? s7WordLabel(id) + ' تم اختيارها. اختاروا فراغًا للوضع.' : '');
  s7Render();
}
function s7CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) s7Tap(id);
}
function s7ZoneClick(z, e) {
  dndGhStop('s7', true);
  if (e && e.target.closest && e.target.closest('.s7-card')) return; // הקשה על מילה מטופלת ב-s7Tap
  if (s7Done || !s7Selected) return;
  s7DismissRetry();
  const id = s7Selected;
  s7Selected = null;
  s7Place(id, z);
  s7Render();
}
function s7ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s7ZoneClick(z);
}
function s7TrayClick(e) {
  if (s7Done || !s7Selected || (e.target.closest && e.target.closest('.s7-card'))) return;
  if (s7Placement[s7Selected] === 'source') return;
  s7DismissRetry();
  s7Placement[s7Selected] = 'source';
  s7Say(s7WordLabel(s7Selected) + ' تم إرجاعها إلى المخزن');
  s7Selected = null;
  s7Render();
}

function s7MarkByZone() {
  s7Marks = {};
  S7.zones.forEach(function (z) {
    const id = s7Occupant(z, null);
    if (id) s7Marks[id] = s7IsRight(z) ? 'correct' : 'wrong';
  });
}

function s7Check() {
  if (s7Done) { advanceScreen(); return; }
  if (!s7AllFilled()) return;
  s7Selected = null;
  s7Attempts++;
  const okCount = S7.zones.filter(s7IsRight).length;
  const ok = okCount === S7.zones.length;
  /* xAPI: matching — the word in each blank; target index per the catalogue (0 החלל הראשון, 1 השני). */
  xapiAnswered('006', 'q1', ok, ok || s7Attempts >= S7.maxAttempts, { pairs: S7.zones.map(function (z, i) { var id = s7Occupant(z, null); return id ? { source: s7WordLabel(id), target: i } : null; }).filter(Boolean) });
  s7Partial = okCount > 0 && !ok;
  if (ok) {
    s7Done = true;
    s7Outcome = 'correct';
    s7MarkByZone();
    s7Render();
    s7ShowPopup('correct');
    s7Finish();
  } else if (s7Attempts >= S7.maxAttempts) {
    s7Done = true;
    s7Outcome = 'wrong2';
    s7Answer = Object.assign({}, s7Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s7View = 'solution';
    s7ApplyView();
    s7Finish();
  } else {
    s7LastWrong = s7Snapshot();
    s7MarkByZone(); // חיווי per-חלל גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
    s7Render();
    s7ShowPopup('retry');
    const btn = document.getElementById('s7q-check');
    if (btn) btn.disabled = true; // Retry gate
    s7Say((s7Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s7Finish() {
  const btn = document.getElementById('s7q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s7q-hint')?.classList.add('s3q-hint-done');
  s7CloseHint();
  syncPracticeProgress2Nav();
}

function s7ShowSolution() {
  S7.order.forEach(function (id) { s7Placement[id] = 'source'; });
  S7.zones.forEach(function (z) { s7Placement[S7.correct[z]] = z; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s7ApplyView() {
  if (s7Answer === null) return;
  if (s7View === 'answer') Object.assign(s7Placement, s7Answer);
  else s7ShowSolution();
  s7MarkByZone();
  s7Render();
  s7ShowPopup('wrong2', s7View);
}
function s7ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s7Answer === null) return;
  s7View = (s7View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s7ApplyView();
}

function s7ShowPopup(type, view) {
  const cfg = S7_FEEDBACK[type];
  const popup = document.getElementById('s7q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": רק הכותרת והכפתור מתחלפים — גוף המשוב המלא נשאר
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהחללים (לא כולם) → "התשובה נכונה חלקית." במקום "אינה נכונה" גורף */
  if (s7Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s7Partial && type === 'wrong2' && view !== 'answer') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (s7Partial && type === 'wrong2' && view === 'answer') title = 'الإجابة صحيحة جزئيًا.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s7q-popup-title').innerHTML = title;
  document.getElementById('s7q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s7q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s7ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState7() {
  syncPracticeProgress2Nav();
  s7InitDnd();
  document.getElementById('s7q-popup')?.classList.add('hidden');
  s7CloseHint();
  s7Selected = null;
  if (s7Done) {
    if (s7Outcome === 'wrong2') { s7View = 'solution'; s7ShowSolution(); }
    s7MarkByZone();
    s7Render();
    const btn = document.getElementById('s7q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s7q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s7Render();
}
function s7ReopenPopup() {
  if (s7Outcome === 'wrong2') { s7View = 'solution'; s7ApplyView(); }
  else if (s7Outcome) s7ShowPopup(s7Outcome);
}
function s7ClosePopups() {
  document.getElementById('s7q-popup')?.classList.add('hidden');
  s7CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s7OpenHint() {
  if (s7Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('006', 'q1');
  document.getElementById('s7q-hint-overlay')?.classList.remove('hidden');
}
function s7CloseHint() { document.getElementById('s7q-hint-overlay')?.classList.add('hidden'); }
function s7CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s7CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s7PopupDrag = null;
function s7PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s7q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s7PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s7PopupMove, { passive: false });
  document.addEventListener('pointerup', s7PopupUp);
  document.addEventListener('pointercancel', s7PopupUp);
  e.preventDefault();
}
function s7PopupMove(e) {
  if (!s7PopupDrag || e.pointerId !== s7PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s7PopupUp(e); return; }
  const popup = document.getElementById('s7q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s7PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s7PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s7PopupUp(e) {
  if (s7PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s7PopupDrag.id) return;
  s7PopupDrag = null;
  document.removeEventListener('pointermove', s7PopupMove);
  document.removeEventListener('pointerup', s7PopupUp);
  document.removeEventListener('pointercancel', s7PopupUp);
}

/* ---------- מחוות-יד (גרירה / לחיצה) — 720-templates → _gesture-hints.md. מועתק ממנגנון סיין 2 (מסכים 4–7).
   שתי נקודות-עוגן אמיתיות מהגיאומטריה החיה (כרטיס מקור ואזור יעד פנוי); היד נעה רק בכיוון המלמד (כרטיס → אזור);
   persistent עד שהלומד מתחיל אינטראקציה בפועל. מסך בחירה (mode: click) — לחיצה במקום אחד, בלי תנועה.
   הדגמה דקורטיבית בלבד — הזוג אינו מפתח תשובה. ---------- */
var DND_GH = {
  s7: { screen: 7, mode: 'drag', stage: '#s7', card: '#s7-tray .s7-card:not(.is-ghost)', zone: '#s7 .s7-zone:not(.occupied)', done: function () { return s7Done; } }
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
      put(dndGhCenter(stage, target));
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
   בדיוק TOTAL_SCREENS מפתחות (8) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['002', 1],
  3: ['003', 1],
  4: ['004', 1],
  5: ['005', 1],
  6: ['005', 2],
  7: ['006', 1]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-03';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1, '005': 1, '006': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-03.json';
var XAPI_END_BTN = 's7q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = ['001/q1', '002/q1', '003/q1', '004/q1', '005/q1', '006/q1'];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
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
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-04/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (42 in this part, listed by the generator from the top-level let/const declarations,
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
      s1Selected: _rsPack(s1Selected),
      s1Attempts: _rsPack(s1Attempts),
      s1Done: _rsPack(s1Done),
      s1Outcome: _rsPack(s1Outcome),
      s1LastWrong: _rsPack(s1LastWrong),
      s1Answer: _rsPack(s1Answer),
      s1View: _rsPack(s1View),
      s2qSelected: _rsPack(s2qSelected),
      s2qAttempts: _rsPack(s2qAttempts),
      s2qDone: _rsPack(s2qDone),
      s2qOutcome: _rsPack(s2qOutcome),
      s2qLastWrong: _rsPack(s2qLastWrong),
      s3qSelected: _rsPack(s3qSelected),
      s3qAttempts: _rsPack(s3qAttempts),
      s3qDone: _rsPack(s3qDone),
      s3qOutcome: _rsPack(s3qOutcome),
      s3qLastWrong: _rsPack(s3qLastWrong),
      s4Selected: _rsPack(s4Selected),
      s4LastWrong: _rsPack(s4LastWrong),
      s4Attempts: _rsPack(s4Attempts),
      s4Done: _rsPack(s4Done),
      s4Outcome: _rsPack(s4Outcome),
      s4Partial: _rsPack(s4Partial),
      s4Answer: _rsPack(s4Answer),
      s4View: _rsPack(s4View),
      s6qSelected: _rsPack(s6qSelected),
      s6qAttempts: _rsPack(s6qAttempts),
      s6qDone: _rsPack(s6qDone),
      s6qOutcome: _rsPack(s6qOutcome),
      s6qLastWrong: _rsPack(s6qLastWrong),
      practiceProgress2: _rsPack(practiceProgress2),
      s7Placement: _rsPack(s7Placement),
      s7Marks: _rsPack(s7Marks),
      s7Selected: _rsPack(s7Selected),
      s7Attempts: _rsPack(s7Attempts),
      s7Done: _rsPack(s7Done),
      s7Outcome: _rsPack(s7Outcome),
      s7LastWrong: _rsPack(s7LastWrong),
      s7Partial: _rsPack(s7Partial),
      s7Answer: _rsPack(s7Answer),
      s7View: _rsPack(s7View)
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
  if (has('s1Selected')) s1Selected = _rsUnpack(v.s1Selected);
  if (has('s1Attempts')) s1Attempts = _rsUnpack(v.s1Attempts);
  if (has('s1Done')) s1Done = _rsUnpack(v.s1Done);
  if (has('s1Outcome')) s1Outcome = _rsUnpack(v.s1Outcome);
  if (has('s1LastWrong')) s1LastWrong = _rsUnpack(v.s1LastWrong);
  if (has('s1Answer')) s1Answer = _rsUnpack(v.s1Answer);
  if (has('s1View')) s1View = _rsUnpack(v.s1View);
  if (has('s2qSelected')) s2qSelected = _rsUnpack(v.s2qSelected);
  if (has('s2qAttempts')) s2qAttempts = _rsUnpack(v.s2qAttempts);
  if (has('s2qDone')) s2qDone = _rsUnpack(v.s2qDone);
  if (has('s2qOutcome')) s2qOutcome = _rsUnpack(v.s2qOutcome);
  if (has('s2qLastWrong')) s2qLastWrong = _rsUnpack(v.s2qLastWrong);
  if (has('s3qSelected')) s3qSelected = _rsUnpack(v.s3qSelected);
  if (has('s3qAttempts')) s3qAttempts = _rsUnpack(v.s3qAttempts);
  if (has('s3qDone')) s3qDone = _rsUnpack(v.s3qDone);
  if (has('s3qOutcome')) s3qOutcome = _rsUnpack(v.s3qOutcome);
  if (has('s3qLastWrong')) s3qLastWrong = _rsUnpack(v.s3qLastWrong);
  if (has('s4Selected')) s4Selected = _rsUnpack(v.s4Selected);
  if (has('s4LastWrong')) s4LastWrong = _rsUnpack(v.s4LastWrong);
  if (has('s4Attempts')) s4Attempts = _rsUnpack(v.s4Attempts);
  if (has('s4Done')) s4Done = _rsUnpack(v.s4Done);
  if (has('s4Outcome')) s4Outcome = _rsUnpack(v.s4Outcome);
  if (has('s4Partial')) s4Partial = _rsUnpack(v.s4Partial);
  if (has('s4Answer')) s4Answer = _rsUnpack(v.s4Answer);
  if (has('s4View')) s4View = _rsUnpack(v.s4View);
  if (has('s6qSelected')) s6qSelected = _rsUnpack(v.s6qSelected);
  if (has('s6qAttempts')) s6qAttempts = _rsUnpack(v.s6qAttempts);
  if (has('s6qDone')) s6qDone = _rsUnpack(v.s6qDone);
  if (has('s6qOutcome')) s6qOutcome = _rsUnpack(v.s6qOutcome);
  if (has('s6qLastWrong')) s6qLastWrong = _rsUnpack(v.s6qLastWrong);
  if (has('s7Marks')) s7Marks = _rsUnpack(v.s7Marks);
  if (has('s7Selected')) s7Selected = _rsUnpack(v.s7Selected);
  if (has('s7Attempts')) s7Attempts = _rsUnpack(v.s7Attempts);
  if (has('s7Done')) s7Done = _rsUnpack(v.s7Done);
  if (has('s7Outcome')) s7Outcome = _rsUnpack(v.s7Outcome);
  if (has('s7LastWrong')) s7LastWrong = _rsUnpack(v.s7LastWrong);
  if (has('s7Partial')) s7Partial = _rsUnpack(v.s7Partial);
  if (has('s7Answer')) s7Answer = _rsUnpack(v.s7Answer);
  if (has('s7View')) s7View = _rsUnpack(v.s7View);
  if (has('practiceProgress') && v.practiceProgress && typeof v.practiceProgress === 'object') _rsAssign(practiceProgress, _rsUnpack(v.practiceProgress));
  if (has('practiceProgress2') && v.practiceProgress2 && typeof v.practiceProgress2 === 'object') _rsAssign(practiceProgress2, _rsUnpack(v.practiceProgress2));
  if (has('s7Placement') && v.s7Placement && typeof v.s7Placement === 'object') _rsAssign(s7Placement, _rsUnpack(v.s7Placement));
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
    case 1: /* single dropdown — the text comes back through applyResumeDom */
      if (s1Done) { var rp1 = rsFn('s1ReopenPopup'); if (rp1) rp1(); else if (s1Outcome === 'correct') s1ShowPopup('correct'); }
      else { var b1 = s1Btn(); if (b1 && s1Selected !== null) b1.removeAttribute('data-empty'); if (s1Attempts > 0) { rsHintOn('s1q-hint'); if (s1LastWrong !== null && s1Selected === s1LastWrong) { s1MarkRetry(); s1ShowPopup('retry'); } } s1UpdateCheck(); } break;
    case 2: rsPaintScq({ sel: s2qSelected, done: s2qDone, lw: s2qLastWrong, att: s2qAttempts, out: s2qOutcome, correct: S2Q.correctId,
      mark: s2qMark, finish: s2qFinish, select: rsFn('s2qSelect'), showPopup: rsFn('s2qShowPopup'), reopen: rsFn('s2qReopenPopup'),
      hint: 's2q-hint', check: 's2q-check' }); break;
    case 3: rsPaintScq({ sel: s3qSelected, done: s3qDone, lw: s3qLastWrong, att: s3qAttempts, out: s3qOutcome, correct: S3Q.correctId,
      mark: s3qMark, finish: s3qFinish, select: rsFn('s3qSelect'), showPopup: rsFn('s3qShowPopup'), reopen: rsFn('s3qReopenPopup'),
      hint: 's3q-hint', check: 's3q-check' }); break;
    case 4: rsPaintDd({ done: s4Done, att: s4Attempts, lw: s4LastWrong, sel: s4Selected, out: s4Outcome, idx: [1, 2], btn: s4Btn, markOne: s4MarkOne,
       update: rsFn('s4UpdateCheck'), showPopup: rsFn('s4ShowPopup'), reopen: rsFn('s4ReopenPopup'), hint: 's4q-hint' }); break;
    case 6: rsPaintScq({ sel: s6qSelected, done: s6qDone, lw: s6qLastWrong, att: s6qAttempts, out: s6qOutcome, correct: S6Q.correctId,
      mark: s6qMark, finish: s6qFinish, select: rsFn('s6qSelect'), showPopup: rsFn('s6qShowPopup'), reopen: rsFn('s6qReopenPopup'),
      hint: 's6q-hint', check: 's6q-check' }); break;
    case 7: rsPaintDnd({ done: s7Done, att: s7Attempts, lw: s7LastWrong, out: s7Outcome, render: rsFn('s7Render'), snap: rsFn('s7Snapshot'),
      update: rsFn('s7UpdateCheck'), showPopup: rsFn('s7ShowPopup'), reopen: rsFn('s7ReopenPopup'), hint: 's7q-hint' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

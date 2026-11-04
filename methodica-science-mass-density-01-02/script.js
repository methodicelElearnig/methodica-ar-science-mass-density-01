'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   הועתק מהמנוע המאומת של methodica-science-mass-density-01-01
   (סיין 1), ריק מתוכן פרטני של אותו סיין. TOTAL_SCREENS יעודכן
   ל-2+ עם הוספת כל מסך אמיתי (שלב זה: מסך placeholder יחיד).
   ========================================================= */

const TOTAL_SCREENS = 7;
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
  if (currentScreen === 2 && n !== 2) { s2qClosePopups(); s2CloseTips(); }
  if (currentScreen === 3 && n !== 3) { s3ClosePopups(); dndGhStop('s3', false); }
  if (currentScreen === 4 && n !== 4) { s4ClosePopups(); dndGhStop('s4', false); }
  if (currentScreen === 5 && n !== 5) { s5ClosePopups(); }
  if (currentScreen === 6 && n !== 6) { s6ClosePopups(); dndGhStop('s6', false); }
  window.__methodicaImageZoomPopupModule?.closePopup(); // פופאפ הגדלת-תמונה נסגר בכל ניווט
  const prev = document.querySelector('.screen.active');
  if (window.Motion) Motion.cancel(prev);
  document.querySelectorAll('.screen').forEach(function (el) {
    el.classList.remove('active');
  });
  if (currentScreen === 1 && n !== 1) { const v1 = document.getElementById('s1-char-video'); if (v1) v1.pause(); }
  if (currentScreen === 0 && n !== 0) { const v = document.getElementById('s0-char-video'); if (v) v.pause(); }
  const target = document.querySelector('.screen[data-screen="' + n + '"]');
  if (!target) return;
  if (typeof wakeMedia === 'function') wakeMedia(target);   /* lazy media (../unit-js/05-media.js): before resetScreenState, which may play() */
  currentScreen = n;
  resetScreenState(n);
  target.classList.add('active');
  if (window.Motion) Motion.reveal(target);
  if (viaBack && n === 2 && s2qDone) s2qReopenPopup();
  if (viaBack && n === 3 && s3Done) s3ReopenPopup();
  if (viaBack && n === 4 && s4Done) s4ReopenPopup();
  if (viaBack && n === 5 && s5Done) s5ReopenPopup();
  if (viaBack && n === 6 && s6Done) s6ReopenPopup();
  if (n === 3) dndGhStart('s3');
  if (n === 4) dndGhStart('s4');
  if (n === 6) dndGhStart('s6');
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
}

/* מסך 1: הדמות מתנגנת פעם אחת, נשארת על הפריים האחרון; יציאה באמצע →
   חזרה ממשיכה מאותה נקודה (לא מאפסים). */
function playS0Video() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
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

/* ---------- ניווט גנרי (Continue/Back + Ctrl+חצים) — הגייט חי ב-advanceScreen,
   כך שגם Ctrl+← עוצר (720-templates → _global-components.md → "Advance gates") ---------- */
function advanceScreen() {
  if (currentScreen === 2 && !s2qDone) return; // מסך 3: ההמשך נפתח רק אחרי שהשאלה נפתרה
  if (currentScreen === 4 && !s4Done) return;  // מסך 5: כנ"ל
  if (currentScreen === 5 && !s5Done) return;  // מסך 6: כנ"ל (resolved, לא correctness)
  if (currentScreen === 6 && !s6Done) return;  // מסך 7: כנ"ל (resolved, לא correctness)
  if (currentScreen === 3 && !s3Done) return;  // מסך 4: כנ"ל (resolved, לא correctness)
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') { s3CloseHint(); s4CloseHint(); s5CloseHint(); s5CloseTips(); s6CloseHint(); }
});

/* resetScreenState0() — מסך 1 (TransitionScreen, שקף 41): סטטי, אין state
   לסנכרן (מנגן את הדמות). */
function resetScreenState0() { playS0Video(); }
playS0Video(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

/* resetScreenState1() — מסך 2 (TransitionScreen + בועה, שקף 42): מנגן את הדמות. */
function resetScreenState1() {
  const vid = document.getElementById('s1-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}

/* =========================================================
   מסך 3 — ValueInputQuestion (Variant C, table-cell) + יישומון מעבדה (שקפים 43+44).
   9 שדות; יחידת ניקוד אחת (נכונה רק אם כל 9 נכונים), סימון ✓/✕ לכל שדה (Case A).
   • 2 ניסיונות (התסריט שותק → ברירת המחדל), אין רמז (אין תוכן רמז בתסריט).
   • "צדקתי?" נפתח כשכל 9 השדות מלאים. Retry gate אחרי שגוי לא-סופי: כבוי עד שהחתימה המנורמלת
     המלאה (כל 9 השדות) שונה מהחתימה שנשלחה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • השוואה אחרי נרמול (הסרת פסיקי אלפים) — Number(raw.replace(/,/g,'')) === תשובה.
   ========================================================= */
const S2Q_KEYS = ['a-mass', 'a-vol', 'a-den', 'b-mass', 'b-vol', 'b-den', 'c-mass', 'c-vol', 'c-den'];
const S2Q = {
  correct: { 'a-mass': 81, 'a-vol': 30, 'a-den': 2.7, 'b-mass': 25, 'b-vol': 50, 'b-den': 0.5, 'c-mass': 89.6, 'c-vol': 10, 'c-den': 8.96 },
  maxAttempts: 2
};
/* אין בתסריט טקסט משוב לשאלה: כותרות כלליות בלבד (fallback קנוני), בלי גוף פדגוגי מומצא. */
const S2Q_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا.', body: [] },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: [],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};
let s2qAttempts = 0;
let s2qDone = false;
let s2qOutcome = null;     // 'correct' | 'wrong2'
let s2qLastWrong = null;   // חתימת הניסיון השגוי האחרון (Retry gate)
let s2qAnswer = null;      // צילום הערכים הגולמיים שהלומד הקליד (לפני חשיפת הפתרון)
let s2qView = 'solution';
let s2qPartial = false;    // חלק מהשדות נכונים וחלק שגויים → "התשובה נכונה חלקית."

function s2qInput(k) { return document.getElementById('s2q-input-' + k); }
function s2qField(k) { return document.getElementById('s2q-field-' + k); }
function s2qNormalize(raw) { return String(raw).trim().replace(/,/g, ''); }
function s2qValues() { const o = {}; S2Q_KEYS.forEach(function (k) { o[k] = s2qInput(k).value; }); return o; }
function s2qSignature() { return S2Q_KEYS.map(function (k) { return s2qNormalize(s2qInput(k).value); }).join('|'); }
function s2qAllFilled() { return S2Q_KEYS.every(function (k) { return s2qNormalize(s2qInput(k).value) !== ''; }); }
function s2qIsOk(k, raw) { const n = s2qNormalize(raw); return n !== '' && Number(n) === S2Q.correct[k]; }
function s2qMark(k, state) {
  const f = s2qField(k);
  f.classList.toggle('is-correct', state === 'correct');
  f.classList.toggle('is-error', state === 'wrong');
}
function s2qMarkAll(vals) { S2Q_KEYS.forEach(function (k) { s2qMark(k, s2qIsOk(k, vals[k]) ? 'correct' : 'wrong'); }); }
function s2qLock(on) { S2Q_KEYS.forEach(function (k) { s2qInput(k).disabled = on; }); }
function s2qUpdateCheck() {
  const btn = document.getElementById('s2q-check');
  if (!btn || s2qDone) return;
  /* Retry gate: אחרי שגוי לא-סופי — כבוי עד שהערכים שונים בפועל (מנורמלים) מהניסיון האחרון */
  btn.disabled = !s2qAllFilled() || (s2qLastWrong !== null && s2qSignature() === s2qLastWrong);
}

(function s2qWire() {
  S2Q_KEYS.forEach(function (k) {
    const inp = s2qInput(k);
    inp.addEventListener('input', function () {
      inp.value = inp.value.replace(/[^0-9,.-]/g, '');   // סינון תווים (type=text — ראו ValueInputQuestion.md)
      if (s2qField(k).classList.contains('is-error')) s2qMark(k, null); // עריכה אחרי שגוי מנקה את סימון השדה
      s2qUpdateCheck();
    });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { const b = document.getElementById('s2q-check'); if (b && !b.disabled) b.click(); }
    });
  });
})();

function s2qCheck() {
  if (s2qDone) { advanceScreen(); return; }
  if (!s2qAllFilled()) return;
  s2qAttempts++;
  const vals = s2qValues();
  const okCount = S2Q_KEYS.filter(function (k) { return s2qIsOk(k, vals[k]); }).length;
  const ok = okCount === S2Q_KEYS.length;
  /* xAPI: performance — the 9 typed values in the catalogue's steps order (mass, volume, density × material a–c). */
  xapiAnswered('001', 'q1', ok, ok || s2qAttempts >= S2Q.maxAttempts, { steps: S2Q_KEYS.map(function (k) { return vals[k]; }) });
  s2qPartial = okCount > 0 && !ok;
  if (ok) {
    s2qDone = true; s2qOutcome = 'correct';
    s2qMarkAll(vals);
    s2qLock(true);
    s2qShowPopup('correct');
    s2qFinish();
  } else if (s2qAttempts >= S2Q.maxAttempts) {
    s2qDone = true; s2qOutcome = 'wrong2';
    s2qAnswer = vals;               // צילום הערכים כפי שהוקלדו, לפני שהחשיפה דורסת אותם
    s2qView = 'solution';
    s2qLock(true);
    s2qApplyView();
    s2qFinish();
  } else {
    s2qLastWrong = s2qSignature();
    s2qMarkAll(vals);
    s2qShowPopup('retry');
    const btn = document.getElementById('s2q-check');
    if (btn) btn.disabled = true;   // Retry gate
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s2qFinish() {
  const btn = document.getElementById('s2q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s2qApplyView() {
  if (s2qAnswer === null) return;
  S2Q_KEYS.forEach(function (k) {
    s2qInput(k).value = (s2qView === 'answer') ? s2qAnswer[k] : String(S2Q.correct[k]);
  });
  if (s2qView === 'answer') s2qMarkAll(s2qAnswer);
  else S2Q_KEYS.forEach(function (k) { s2qMark(k, 'correct'); });
  s2qShowPopup('wrong2', s2qView);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
}
function s2qToggleView() {   // החלפת תצוגה בלבד — לא נוגע בניסיונות / done
  if (s2qAnswer === null) return;
  s2qView = (s2qView === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s2qApplyView();
}

function s2qShowPopup(type, view) {
  const cfg = S2Q_FEEDBACK[type];
  const popup = document.getElementById('s2q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, action = cfg.action || null;
  if (s2qPartial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s2qPartial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;
    title = title.split('<br>')[0]; // בתצוגת תשובת הלומד הפתרון לא מוצג
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s2q-popup-title').innerHTML = title;
  document.getElementById('s2q-popup-body').innerHTML = cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s2q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s2qToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}
function s2qReopenPopup() {
  if (s2qOutcome === 'wrong2') { s2qView = 'solution'; s2qApplyView(); }
  else if (s2qOutcome) s2qShowPopup(s2qOutcome);
}
function s2qClosePopups() { document.getElementById('s2q-popup')?.classList.add('hidden'); }

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא (כולל הערכים) */
function resetScreenState2() {
  syncPracticeProgressNav(document.getElementById('s2'));
  document.getElementById('s2q-popup')?.classList.add('hidden');
  s2CloseTips();
  if (s2qDone) {
    s2qLock(true);
    if (s2qOutcome === 'wrong2') { s2qView = 'solution'; s2qApplyView(); s2qClosePopups(); }
    const btn = document.getElementById('s2q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    return;
  }
  s2qUpdateCheck();
}

/* הרחבות "?" (שקף 44): הקשה פותחת/סוגרת; Escape / לחיצה בחוץ סוגרים */
function s2CloseTips() {
  ['vol', 'den'].forEach(function (k) {
    document.getElementById('s2-tip-' + k)?.classList.add('hidden');
    document.getElementById('s2-info-' + k)?.setAttribute('aria-expanded', 'false');
  });
}
function s2ShowTip(k, e) {
  if (e) e.stopPropagation();
  s2CloseTips();
  document.getElementById('s2-tip-' + k)?.classList.remove('hidden');
  document.getElementById('s2-info-' + k)?.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', function (e) {
  if (!e.target.closest || (!e.target.closest('.s2-info') && !e.target.closest('.s2-tip'))) s2CloseTips();
});
document.addEventListener('keydown', function (e) { if (e.key === 'Escape') s2CloseTips(); });

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s2qPopupDrag = null;
function s2qScale() {
  const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}
function s2qPopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = s2qScale();
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
  const scale = s2qScale();
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
   Progress Question (720-templates → _global-components.md → "Progress Question"): 4 שאלות בסדרה;
   מסך 3 = שאלה 1 (סעיף א'). פריט ההתקדמות הוא שאלה, לא מסך — בתרגול בסיסי הוא לא נפתר מוקדם: נשאר
   "current" עד שכל סעיפי השאלה נענו. שאר סעיפי שאלה 1 ושאלות 2–4 עוד לא נבנו (screens ריק) —
   כשייבנו, יוסיפו כאן את מספרי המסכים ואת הסכמת התוצאה ב-progressItemResult.
   ========================================================= */
const practiceProgress = {
  questions: [
    { number: 1, screens: [2, 3] },
    { number: 2, screens: [4] },
    { number: 3, screens: [5] },
    { number: 4, screens: [6] }
  ]
};
/* פריט התקדמות = שאלה (Basic/Standard): נפתר רק כשכל סעיפיה נענו; ✓ רק אם כולם נכונים. שאלה 1 = סעיף א' (מסך 3) + סעיף ב' (מסך 4).
   שאלות 2–4 עוד לא נבנו — כשייבנו, יוסיפו כאן את סעיפיהן. */
function progressItemResult(q) {
  if (q.number === 1 && s2qDone && s3Done) return (s2qOutcome === 'correct' && s3Outcome === 'correct') ? 'correct' : 'incorrect';
  if (q.number === 2 && s4Done) return s4Outcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 3 && s5Done) return s5Outcome === 'correct' ? 'correct' : 'incorrect';
  if (q.number === 4 && s6Done) return s6Outcome === 'correct' ? 'correct' : 'incorrect';
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
   מסך 4 (#s3) — שאלת גרירה: שאלה 1 סעיף ב' (שקף 45) — DragAndDropQuestion, וריאנט מקומי
   (שלושה אזורי שחרור, פריט אחד לכל אזור; מזהה הכרטיס = מזהה האזור הנכון).
   מפתח לפי הערת המפיקה: הקו התלול ביותר (העליון) — נחושת; האמצעי — אלומיניום; המתון (התחתון) — עץ אורן.
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה (שקף 45).
   • "צדקתי?" נפתח כשכל 3 הכרטיסים הונחו; Retry gate אחרי שגוי לא-סופי: כבוי עד שההנחה שונה בפועל מהשגויה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; החלפה לא נוגעת בניסיונות/done; חזרה (Back) למסך
     פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על אזור מניחה, הקשה על הטור מחזירה.
   ========================================================= */
function getAppScale() {
  const m = document.getElementById('app').style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

/* Pointer-based drag-and-drop (עכבר + מגע) — מנגנון אחד מהלחיצה ועד השחרור (pointerdown/move/up/cancel);
   מופע-הרפאים משובט ל-body ומוקטן כמו #app; תנועה קטנה מ-6px = הקשה (onTap). זהה למנגנון בסיין 1. */
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

const S3 = {
  order: ['al', 'pine', 'cu'],
  correct: { cu: 'cu', al: 'al', pine: 'pine' },       // כרטיס → אזור (מזהה זהה)
  zoneName: { cu: 'الخط العلوي', al: 'الخط الأوسط', pine: 'الخط السفلي' },
  maxAttempts: 2
};
const S3_EXPLAIN = 'خشب الصنوبر يتناسب مع الخط الأكثر اعتدالًا، الألومنيوم مع الخط الأوسط، والنحاس مع الخط الأكثر انحدارًا. مع كل إضافة قدرها 1 سم³، تزداد الكتلة وفقًا لكثافة المادة.';
const S3_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: [S3_EXPLAIN] },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: [S3_EXPLAIN],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};

const s3Placement = {};       // cardId → 'source' | zoneId
S3.order.forEach(function (id) { s3Placement[id] = 'source'; });
let s3Marks = {};             // cardId → 'correct' | 'wrong' (אחרי בדיקה)
let s3Selected = null;        // כרטיס שנבחר בהקשה/מקלדת
let s3Attempts = 0;
let s3Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s3Outcome = null;         // 'correct' | 'wrong2'
let s3LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s3Partial = false;        // לפחות כרטיס אחד במקום הנכון אך לא כולם → "התשובה נכונה חלקית." (כלל קבוע בשאלות גרירה)
let s3Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s3View = 'solution';
let s3Dnd = null;

function s3Snapshot() { return JSON.stringify(S3.order.map(function (id) { return s3Placement[id]; })); }
function s3AllPlaced() { return S3.order.every(function (id) { return s3Placement[id] !== 'source'; }); }
function s3Say(msg) { const el = document.getElementById('s3-live'); if (el) el.textContent = msg; }
function s3CardLabel(id) { return document.querySelector('#s3-d-' + id + ' .s3-card__name').textContent; }
function s3Occupant(zone, except) {
  return S3.order.find(function (id) { return id !== except && s3Placement[id] === zone; }) || null;
}
/* הנחת כרטיס באזור; אם האזור תפוס — הדייר מוחזר לטור (Interaction rules: evict) */
function s3Place(id, zone) {
  const occ = s3Occupant(zone, id);
  if (occ) s3Placement[occ] = 'source';
  s3Placement[id] = zone;
  s3Say(s3CardLabel(id) + ' وُضِع في' + S3.zoneName[zone]);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s3DismissRetry() {
  if (s3Done) return;
  s3Marks = {};
  document.getElementById('s3q-popup')?.classList.add('hidden');
}

function s3Render() {
  S3.order.forEach(function (id) {
    const src = document.getElementById('s3-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s3Placement[id] !== 'source');
    src.classList.toggle('is-locked', s3Done);
    const sel = s3Selected === id;
    src.classList.toggle('is-selected', sel && s3Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s3Done ? 'true' : 'false');
    src.setAttribute('tabindex', s3Placement[id] === 'source' ? '0' : '-1');
  });
  Object.keys(S3.zoneName).forEach(function (z) {
    const zone = document.getElementById('s3-zone-' + z);
    zone.querySelectorAll('.s3-card').forEach(function (c) { c.remove(); });
    const id = s3Occupant(z, null);
    if (id) {
      const srcEl = document.getElementById('s3-d-' + id);
      const chip = document.createElement('div');
      chip.className = 's3-card is-placed';
      chip.dataset.id = id;
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      const icon = document.createElement('span');        /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
      icon.className = 's3-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      chip.appendChild(icon);
      chip.appendChild(srcEl.querySelector('.s3-card__img').cloneNode(true));
      chip.appendChild(srcEl.querySelector('.s3-card__text').cloneNode(true));
      chip.classList.toggle('is-selected', s3Selected === id);
      chip.classList.toggle('is-locked', s3Done);
      chip.setAttribute('aria-pressed', s3Selected === id ? 'true' : 'false');
      chip.setAttribute('aria-label', s3CardLabel(id) + ' — ب' + S3.zoneName[z] +
        (s3Marks[id] === 'correct' ? '، صحيح' : s3Marks[id] === 'wrong' ? '، غير صحيح' : ''));
      if (s3Marks[id]) chip.classList.add(s3Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
      zone.appendChild(chip);
      if (!s3Done && s3Dnd) s3Dnd.attachSource(chip, id);
      chip.addEventListener('keydown', s3CardKey);
    }
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s3Done);
  });
  s3UpdateCheck();
}

function s3UpdateCheck() {
  if (s3Done) return;
  const btn = document.getElementById('s3q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s3AllPlaced() || (s3LastWrong !== null && s3Snapshot() === s3LastWrong);
}

function s3InitDnd() {
  if (s3Dnd) return;
  s3Dnd = createPointerDnd({
    canDrag: function () { return !s3Done; },
    onPick: function (id) {
      dndGhStop('s3', true);
      s3DismissRetry();
      s3Selected = null;
      s3Placement[id] = 'source';
      s3Render();
      document.getElementById('s3-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s3Place(id, zone); s3Render(); },
    onCancel: function () { s3Render(); },
    onTap: function (id) { s3Tap(id); }
  });
  S3.order.forEach(function (id) { s3Dnd.attachSource(document.getElementById('s3-d-' + id), id); });
  document.querySelectorAll('#s3 .s3-zone').forEach(function (z) { s3Dnd.attachTarget(z, z.dataset.zone); });
  document.querySelectorAll('#s3 .s3-card').forEach(function (c) { c.addEventListener('keydown', s3CardKey); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על אזור */
function s3Tap(id) {
  if (s3Done) return;
  dndGhStop('s3', true);
  s3DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על כרטיס שכבר מונח באזור → הנחה באותו אזור (הכרטיס ממלא את האזור) */
  if (s3Selected && s3Selected !== id && s3Placement[id] !== 'source') {
    const moved = s3Selected;
    s3Selected = null;
    s3Place(moved, s3Placement[id]);
    s3Render();
    return;
  }
  s3Selected = (s3Selected === id) ? null : id;
  s3Say(s3Selected ? s3CardLabel(id) + ' تم الاختيار. اختاروا منطقة على الرسم البياني.' : '');
  s3Render();
}
function s3CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s3Tap(e.currentTarget.dataset.id);
}
function s3ZoneClick(z, e) {
  if (e && e.target.closest && e.target.closest('.s3-card')) return; // הקשה על כרטיס מטופלת ב-s3Tap
  if (s3Done || !s3Selected) return;
  s3DismissRetry();
  const id = s3Selected;
  s3Selected = null;
  s3Place(id, z);
  s3Render();
}
function s3ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s3ZoneClick(z);
}
function s3TrayClick(e) {
  if (s3Done || !s3Selected || (e.target.closest && e.target.closest('.s3-card'))) return;
  if (s3Placement[s3Selected] === 'source') return;
  s3DismissRetry();
  s3Placement[s3Selected] = 'source';
  s3Say(s3CardLabel(s3Selected) + ' تم إرجاعه إلى العمود');
  s3Selected = null;
  s3Render();
}

function s3Check() {
  if (s3Done) { advanceScreen(); return; }
  if (!s3AllPlaced()) return;
  s3Selected = null;
  s3Attempts++;
  document.getElementById('s3q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  const okCount = S3.order.filter(function (id) { return s3Placement[id] === S3.correct[id]; }).length;
  const ok = okCount === S3.order.length;
  /* xAPI: matching — placed cards only, both sides as catalogue indexes: S3.order is the catalogue's
     answers.source order (the card shows the material name alone, the catalogue string carries the
     density); target 0 הקו העליון בגרף, 1 האמצעי, 2 התחתון. */
  xapiAnswered('001', 'q2', ok, ok || s3Attempts >= S3.maxAttempts, { pairs: S3.order.filter(function (id) { return s3Placement[id] !== 'source'; }).map(function (id) { return { source: S3.order.indexOf(id), target: ({ cu: 0, al: 1, pine: 2 })[s3Placement[id]] }; }) });
  s3Partial = okCount > 0 && !ok;
  if (ok) {
    s3Done = true;
    s3Outcome = 'correct';
    S3.order.forEach(function (id) { s3Marks[id] = 'correct'; });
    s3Render();
    s3ShowPopup('correct');
    s3Finish();
  } else if (s3Attempts >= S3.maxAttempts) {
    s3Done = true;
    s3Outcome = 'wrong2';
    s3Answer = Object.assign({}, s3Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s3View = 'solution';
    s3ApplyView();
    s3Finish();
  } else {
    s3LastWrong = s3Snapshot();
    S3.order.forEach(function (id) { s3Marks[id] = (s3Placement[id] === S3.correct[id]) ? 'correct' : 'wrong'; });
    s3Render();
    s3ShowPopup('retry');
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

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s3ApplyView() {
  if (s3Answer === null) return;
  if (s3View === 'answer') {
    Object.assign(s3Placement, s3Answer);
    S3.order.forEach(function (id) { s3Marks[id] = (s3Placement[id] === S3.correct[id]) ? 'correct' : 'wrong'; });
  } else {
    Object.assign(s3Placement, S3.correct);
    S3.order.forEach(function (id) { s3Marks[id] = 'correct'; });
  }
  s3Render();
  s3ShowPopup('wrong2', s3View);
}
function s3ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s3Answer === null) return;
  s3View = (s3View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s3ApplyView();
}

function s3ShowPopup(type, view) {
  const cfg = S3_FEEDBACK[type];
  const popup = document.getElementById('s3q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, action = cfg.action || null;
  /* שאלות גרירה: נכון על חלק מהכרטיסים (לא כולם) → "התשובה נכונה חלקית." במקום "לא נכונה" גורף */
  if (s3Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s3Partial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;  // הכפתור מתחלף
    title = title.split('<br>')[0];  // בתצוגת תשובת הלומד אין "התשובה הנכונה מוצגת."
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s3q-popup-title').innerHTML = title;
  document.getElementById('s3q-popup-body').innerHTML = cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
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

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState3() {
  syncPracticeProgressNav(document.getElementById('s3'));
  s3InitDnd();
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3CloseHint();
  s3Selected = null;
  if (s3Done) {
    if (s3Outcome === 'wrong2') {
      s3View = 'solution';
      Object.assign(s3Placement, S3.correct);
      S3.order.forEach(function (id) { s3Marks[id] = 'correct'; });
    }
    s3Render();
    const btn = document.getElementById('s3q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s3q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s3Render();
}
function s3ReopenPopup() {
  if (s3Outcome === 'wrong2') { s3View = 'solution'; s3ApplyView(); }
  else if (s3Outcome) s3ShowPopup(s3Outcome);
}
function s3ClosePopups() {
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s3OpenHint() {
  if (s3Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q2');
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
  const nx = (e.clientX - rect.left) / scale - s3PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s3PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s3PopupUp(e) {
  if (s3PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s3PopupDrag.id) return;
  s3PopupDrag = null;
  document.removeEventListener('pointermove', s3PopupMove);
  document.removeEventListener('pointerup', s3PopupUp);
  document.removeEventListener('pointercancel', s3PopupUp);
}

/* ---------- מחוות-יד (גרירה) — 720-templates → _gesture-hints.md → "Drag-specific rules": שתי נקודות-עוגן אמיתיות
   (כרטיס מקור ואזור יעד) מהגיאומטריה החיה; היד נעה רק בכיוון המלמד (כרטיס → אזור); persistent עד שהלומד מתחיל
   אינטראקציה בפועל. הדגמה דקורטיבית בלבד — הזוג אינו מפתח תשובה. מועתק ממנגנון סיין 1. ---------- */
const DND_GH = {
  s3: { stage: '#s3 .s3-stage', card: 's3-d-al', zone: 's3-zone-al', done: function () { return s3Done; } },
  s4: { stage: '#s4 .s4-stage', card: 's4-d-a', zone: 's4-zone', done: function () { return s4Done; } },
  s6: { stage: '#s6 .s6-stage', card: 's6-d-raft', zone: 's6-zone-float', done: function () { return s6Done; } }
};
const dndGhState = { s3: { token: 0, understood: false }, s4: { token: 0, understood: false }, s6: { token: 0, understood: false } };

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

  let ghRuns = 0; // ההבהוב מופיע פעמיים בלבד ואז נעלם (עדכון מעצבת; גם לנגישות)
  function cycle() {
    if (ghRuns >= 2) { gh.classList.remove('is-on', 'is-moving', 'is-click'); gh.classList.add('hidden'); return; }
    ghRuns++;
    const card = document.getElementById(cfg.card);
    const zone = document.getElementById(cfg.zone);
    if (!card || !zone || card.classList.contains('is-ghost')) return;
    const a = dndGhCenter(stage, card);
    const b = dndGhCenter(stage, zone);
    const put = function (p) {
      gh.style.left = (p.x - gh.offsetWidth / 2) + 'px';
      gh.style.top = (p.y - gh.offsetHeight / 2) + 'px';
    };
    gh.classList.remove('is-on', 'is-moving', 'is-click');
    gh.classList.remove('hidden');
    put(a);
    void gh.offsetWidth;
    later(function () {
      gh.classList.add('is-on', 'is-click');   // שלב 1: הופעה + לחיצה על הכרטיס
      later(function () {
        gh.classList.remove('is-click');
        void gh.offsetWidth;
        gh.classList.add('is-moving');         // שלב 2: גרירה אל האזור (קדימה בלבד)
        put(b);
        later(function () {                    // שלב 3: עמידה ביעד, ואז דהייה במקום
          gh.classList.remove('is-on');
          later(function () {                  // שלב 4: שקופה לגמרי → חוזרים להתחלה
            gh.classList.remove('is-moving');
            later(cycle, 400);
          }, 300);
        }, 1100 + 600);
      }, 1200);
    }, 50);
  }
  later(cycle, 800); // אחרי שאנימציית-הכניסה של המסך הסתיימה
}

function dndGhStop(id, understood) {
  const st = dndGhState[id];
  st.token++;
  if (understood) st.understood = true;
  const gh = document.getElementById(id + '-gh');
  if (gh) {
    gh.classList.remove('is-on', 'is-moving', 'is-click');
    gh.classList.add('hidden');
  }
}


/* =========================================================
   מסך 5 (#s4) — שאלת גרירה לגרף: שאלה 2 (שקף 46) — DragAndDropQuestion, וריאנט מקומי (יעד גרירה יחיד
   על הגרף; 4 כרטיסי מספר, אחד נכון). מנגנון זהה למסך 4 (createPointerDnd / gesture / popup משותפים).
   תשובה נכונה לפי הערת המפיקה: 16.2 (6 · 2.7). מזהי כרטיסים: a=8.7 · b=13.5 · c=16.2 · d=12.
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה (שקף 46).
   • "צדקתי?" נפתח כשהוצב כרטיס באזור; Retry gate אחרי שגוי לא-סופי: כבוי עד שהכרטיס באזור שונה.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על האזור מניחה, הקשה על השורה מחזירה.
   ========================================================= */
const S4 = {
  order: ['a', 'b', 'c', 'd'],
  correct: 'c',
  maxAttempts: 2
};
/* גוף המשוב — שקף 46 (מילה במילה). ירידת השורה לפני המשוואה = מעבר-שורה ידני ("\v") במקור. */
const S4_EXPLAIN = [
  'في كل 1 سم³ من الألومنيوم يوجد 2.7 غرام.',
  'لذلك، سيكون لجسم من الألومنيوم حجمه 6 سم³ كتلة مقدارها 16.2 غرام:<br><span class="s4-eq">6 · 2.7 = 16.2</span>'
];
const S4_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز!', body: S4_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S4_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};

const s4Placement = {};       // cardId → 'source' | 't'
S4.order.forEach(function (id) { s4Placement[id] = 'source'; });
let s4Marks = {};             // cardId → 'correct' | 'wrong' (אחרי בדיקה)
let s4Selected = null;
let s4Attempts = 0;
let s4Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s4Outcome = null;         // 'correct' | 'wrong2'
let s4LastWrong = null;       // כרטיס שהונח בניסיון השגוי הלא-סופי האחרון (Retry gate)
let s4Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s4View = 'solution';
let s4Dnd = null;

function s4Occupant(except) {
  return S4.order.find(function (id) { return id !== except && s4Placement[id] === 't'; }) || null;
}
function s4Snapshot() { return JSON.stringify(s4Occupant(null)); }
function s4Say(msg) { const el = document.getElementById('s4-live'); if (el) el.textContent = msg; }
function s4CardLabel(id) { return document.querySelector('#s4-d-' + id + ' .s4-card__text').textContent; }
/* הנחת כרטיס באזור; אם האזור תפוס — הדייר מוחזר לשורה (Interaction rules: evict) */
function s4Place(id) {
  const occ = s4Occupant(id);
  if (occ) s4Placement[occ] = 'source';
  s4Placement[id] = 't';
  s4Say(s4CardLabel(id) + ' وُضِع في الرسم البياني');
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
  const zone = document.getElementById('s4-zone');
  zone.querySelectorAll('.s4-card').forEach(function (c) { c.remove(); });
  const id = s4Occupant(null);
  if (id) {
    const srcEl = document.getElementById('s4-d-' + id);
    const chip = document.createElement('div');
    chip.className = 's4-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');        /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
    icon.className = 's4-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    chip.appendChild(icon);
    chip.appendChild(srcEl.querySelector('.s4-card__text').cloneNode(true));
    chip.classList.toggle('is-selected', s4Selected === id);
    chip.classList.toggle('is-locked', s4Done);
    chip.setAttribute('aria-pressed', s4Selected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', s4CardLabel(id) + ' — في الرسم البياني' +
      (s4Marks[id] === 'correct' ? '، صحيح' : s4Marks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (s4Marks[id]) chip.classList.add(s4Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
    zone.appendChild(chip);
    if (!s4Done && s4Dnd) s4Dnd.attachSource(chip, id);
    chip.addEventListener('keydown', s4CardKey);
  }
  zone.classList.toggle('occupied', !!id);
  zone.classList.toggle('is-locked', s4Done);
  s4UpdateCheck();
}

function s4UpdateCheck() {
  if (s4Done) return;
  const btn = document.getElementById('s4q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = s4Occupant(null) === null || (s4LastWrong !== null && s4Snapshot() === s4LastWrong);
}

function s4InitDnd() {
  if (s4Dnd) return;
  s4Dnd = createPointerDnd({
    canDrag: function () { return !s4Done; },
    onPick: function (id) {
      dndGhStop('s4', true);
      s4DismissRetry();
      s4Selected = null;
      s4Placement[id] = 'source';
      s4Render();
      document.getElementById('s4-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id) { s4Place(id); s4Render(); },
    onCancel: function () { s4Render(); },
    onTap: function (id) { s4Tap(id); }
  });
  S4.order.forEach(function (id) { s4Dnd.attachSource(document.getElementById('s4-d-' + id), id); });
  s4Dnd.attachTarget(document.getElementById('s4-zone'), 't');
  document.querySelectorAll('#s4 .s4-card').forEach(function (c) { c.addEventListener('keydown', s4CardKey); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על האזור */
function s4Tap(id) {
  if (s4Done) return;
  dndGhStop('s4', true);
  s4DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על הכרטיס שכבר מונח באזור → הכרטיס הנבחר מחליף אותו */
  if (s4Selected && s4Selected !== id && s4Placement[id] !== 'source') {
    const moved = s4Selected;
    s4Selected = null;
    s4Place(moved);
    s4Render();
    return;
  }
  s4Selected = (s4Selected === id) ? null : id;
  s4Say(s4Selected ? s4CardLabel(id) + ' تم الاختيار. اختاروا المكان في الرسم البياني.' : '');
  s4Render();
}
function s4CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s4Tap(e.currentTarget.dataset.id);
}
function s4ZoneClick(e) {
  if (e && e.target.closest && e.target.closest('.s4-card')) return; // הקשה על כרטיס מטופלת ב-s4Tap
  if (s4Done || !s4Selected) return;
  s4DismissRetry();
  const id = s4Selected;
  s4Selected = null;
  s4Place(id);
  s4Render();
}
function s4ZoneKey(e) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s4ZoneClick();
}
function s4TrayClick(e) {
  if (s4Done || !s4Selected || (e.target.closest && e.target.closest('.s4-card'))) return;
  if (s4Placement[s4Selected] === 'source') return;
  s4DismissRetry();
  s4Placement[s4Selected] = 'source';
  s4Say(s4CardLabel(s4Selected) + ' تم إرجاعه إلى الصف');
  s4Selected = null;
  s4Render();
}

function s4Check() {
  if (s4Done) { advanceScreen(); return; }
  if (s4Occupant(null) === null) return;
  s4Selected = null;
  s4Attempts++;
  document.getElementById('s4q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  const ok = s4Occupant(null) === S4.correct;
  /* xAPI: choice (the catalogue type) — the dragged card is the option; index in answers order a..d. */
  xapiAnswered('002', 'q1', ok, ok || s4Attempts >= S4.maxAttempts, { choices: [xapiOptIdx(s4Occupant(null))] });
  if (ok) {
    s4Done = true;
    s4Outcome = 'correct';
    s4Marks[S4.correct] = 'correct';
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
    s4Marks[s4Occupant(null)] = 'wrong';
    s4Render();
    s4ShowPopup('retry');
    const btn = document.getElementById('s4q-check');
    if (btn) btn.disabled = true; // Retry gate
    s4Say('الإجابة غير صحيحة. حاولوا مرة أخرى.');
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

/* חשיפת הפתרון: הכרטיס הנכון באזור, המסיחים חוזרים לשורה */
function s4RevealSolution() {
  S4.order.forEach(function (id) { s4Placement[id] = (id === S4.correct) ? 't' : 'source'; });
  s4Marks = {};
  s4Marks[S4.correct] = 'correct';
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s4ApplyView() {
  if (s4Answer === null) return;
  s4Marks = {};
  if (s4View === 'answer') {
    Object.assign(s4Placement, s4Answer);
    const id = s4Occupant(null);
    if (id) s4Marks[id] = (id === S4.correct) ? 'correct' : 'wrong';
  } else {
    s4RevealSolution();
  }
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
  let title = cfg.title, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;  // הכפתור מתחלף
    title = title.split('<br>')[0];  // בתצוגת תשובת הלומד אין "התשובה הנכונה מוצגת."
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s4q-popup-title').innerHTML = title;
  document.getElementById('s4q-popup-body').innerHTML = cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
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

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState4() {
  syncPracticeProgressNav(document.getElementById('s4'));
  s4InitDnd();
  document.getElementById('s4q-popup')?.classList.add('hidden');
  s4CloseHint();
  s4Selected = null;
  if (s4Done) {
    if (s4Outcome === 'wrong2') { s4View = 'solution'; s4RevealSolution(); }
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
  xapiRequestedHint('002', 'q1');
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
   מסך 6 (#s5) — נכון/לא נכון: שאלה 3 מתוך 4 (שקף 47) — StatementAssessmentQuestion (TrueFalseQuestion).
   4 היגדים; יחידת ניקוד אחת (נכונה רק אם כל 4 נכונים). מפתח: א נכון · ב לא נכון · ג נכון · ד נכון.
   • ניסיון אחד בלבד (בקשת לקוחה, שאלות נכון/לא נכון); ללא ניסיון שני → רמז לא רלוונטי (מופיע רק אחרי ניסיון ראשון).
   • "צדקתי?" נפתח כשכל 4 ההיגדים נענו; Retry gate אחרי שגוי לא-סופי: כבוי עד שחתימת התשובות שונה מהשגויה.
   • שגוי לא-סופי: ✓/✕ לכל היגד, ללא חשיפת הנכון; כל שינוי בחירה מנקה את הסימונים והמשוב.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • "?" ליד "תלול": טולטיפ (הערת מפיקה), הקשה/ריחוף/פוקוס פותחים; Escape / לחיצה בחוץ סוגרים.
   ========================================================= */
const S5 = { correct: ['T', 'F', 'T', 'T'], maxAttempts: 1 };   /* בקשת לקוחה: בשאלות נכון/לא נכון — הזדמנות אחת בלבד; תשובה שגויה מציגה מיד את הפתרון */
const S5_EXPLAIN = [
  'سيطفو خشب شجرة البلوط، بينما سيغرق الزجاج والرصاص.',
  'في رسم بياني للكتلة-الحجم، يمثل الخط الأكثر انحدارًا من خط الماء مادةً كثافتها أعلى من كثافة الماء، ولذلك فهي تغرق.'
];
const S5_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز!', body: S5_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S5_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};

let s5Sel = S5.correct.map(function () { return null; });   // 'T' | 'F' | null לכל היגד
let s5Marks = S5.correct.map(function () { return null; }); // 'correct' | 'wrong' | null
let s5Attempts = 0;
let s5Done = false;        // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s5Outcome = null;      // 'correct' | 'wrong2'
let s5LastWrong = null;    // חתימת התשובות בניסיון השגוי הלא-סופי האחרון (Retry gate)
let s5Answer = null;       // צילום תשובת הלומד בשגוי הסופי
let s5View = 'solution';

function s5Snapshot() { return JSON.stringify(s5Sel); }
function s5Say(msg) { const el = document.getElementById('s5-live'); if (el) el.textContent = msg; }
function s5Judge() {
  return s5Sel.map(function (v, i) { return v === S5.correct[i] ? 'correct' : 'wrong'; });
}

function s5Render() {
  document.querySelectorAll('#s5 .s5-row').forEach(function (row) {
    const i = Number(row.dataset.row);
    row.querySelectorAll('.s5-opt').forEach(function (opt) {
      const on = s5Sel[i] === opt.dataset.v;
      opt.classList.toggle('is-selected', on);
      opt.classList.toggle('is-correct', on && s5Marks[i] === 'correct');
      opt.classList.toggle('is-wrong', on && s5Marks[i] === 'wrong');
      opt.classList.toggle('is-locked', s5Done);
      opt.setAttribute('aria-checked', on ? 'true' : 'false');
      opt.setAttribute('aria-disabled', s5Done ? 'true' : 'false');
    });
  });
  s5UpdateCheck();
}

function s5UpdateCheck() {
  if (s5Done) return;
  const btn = document.getElementById('s5q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מהחתימה השגויה האחרונה */
  btn.disabled = s5Sel.some(function (v) { return v === null; }) || (s5LastWrong !== null && s5Snapshot() === s5LastWrong);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s5DismissRetry() {
  if (s5Done) return;
  s5Marks = s5Marks.map(function () { return null; });
  document.getElementById('s5q-popup')?.classList.add('hidden');
}

function s5Pick(i, v) {
  if (s5Done) return;
  s5DismissRetry();
  s5Sel[i] = v;
  s5Say('عبارة ' + (i + 1) + ': ' + (v === 'T' ? 'صحيح' : 'غير صحيح'));
  s5Render();
}

function s5Check() {
  if (s5Done) { advanceScreen(); return; }
  if (s5Sel.some(function (v) { return v === null; })) return;
  s5Attempts++;
  document.getElementById('s5q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  s5Marks = s5Judge();
  const ok = s5Marks.every(function (m) { return m === 'correct'; });
  /* xAPI: four true-false questions, one per statement row (q1..q4 in row order); one attempt each. */
  xapiAnswered('003', 'q1', s5Sel[0] === S5.correct[0], s5Sel[0] === S5.correct[0] || s5Attempts >= S5.maxAttempts, { value: s5Sel[0] === 'T' });
  xapiAnswered('003', 'q2', s5Sel[1] === S5.correct[1], s5Sel[1] === S5.correct[1] || s5Attempts >= S5.maxAttempts, { value: s5Sel[1] === 'T' });
  xapiAnswered('003', 'q3', s5Sel[2] === S5.correct[2], s5Sel[2] === S5.correct[2] || s5Attempts >= S5.maxAttempts, { value: s5Sel[2] === 'T' });
  xapiAnswered('003', 'q4', s5Sel[3] === S5.correct[3], s5Sel[3] === S5.correct[3] || s5Attempts >= S5.maxAttempts, { value: s5Sel[3] === 'T' });
  if (ok) {
    s5Done = true;
    s5Outcome = 'correct';
    s5Render();
    s5ShowPopup('correct');
    s5Finish();
  } else if (s5Attempts >= S5.maxAttempts) {
    s5Done = true;
    s5Outcome = 'wrong2';
    s5Answer = s5Sel.slice(); // צילום לפני שהחשיפה דורסת את הבחירה
    s5View = 'solution';
    s5ApplyView();
    s5Finish();
  } else {
    s5LastWrong = s5Snapshot();
    s5Render();
    s5ShowPopup('retry');
    const btn = document.getElementById('s5q-check');
    if (btn) btn.disabled = true; // Retry gate
    s5Say('الإجابة غير صحيحة. حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s5Finish() {
  const btn = document.getElementById('s5q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s5q-hint')?.classList.add('s3q-hint-done');
  s5CloseHint();
  syncPracticeProgressNav(document.getElementById('s5'));
}

function s5RevealSolution() {
  s5Sel = S5.correct.slice();
  s5Marks = S5.correct.map(function () { return 'correct'; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s5ApplyView() {
  if (s5Answer === null) return;
  if (s5View === 'answer') {
    s5Sel = s5Answer.slice();
    s5Marks = s5Judge();
  } else {
    s5RevealSolution();
  }
  s5Render();
  s5ShowPopup('wrong2', s5View);
}
function s5ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s5Answer === null) return;
  s5View = (s5View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s5ApplyView();
}

function s5ShowPopup(type, view) {
  const cfg = S5_FEEDBACK[type];
  const popup = document.getElementById('s5q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;  // הכפתור מתחלף
    title = title.split('<br>')[0];  // בתצוגת תשובת הלומד אין "התשובה הנכונה מוצגת."
  }
  /* כלל קבוע: חלק מההיגדים נכונים (לפחות אחד, לא כולם) → "התשובה נכונה חלקית." בשגוי לא-סופי ובשגוי סופי */
  const judged = (type === 'retry') ? s5Sel : (type === 'wrong2' ? s5Answer : null);
  if (judged && judged.some(function (v, i) { return v === S5.correct[i]; })) {
    title = title.replace('الإجابة غير صحيحة.', 'الإجابة صحيحة جزئيًا.').replace('الإجابة غير صحيحة.', 'الإجابة صحيحة جزئيًا.');
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s5q-popup-title').innerHTML = title;
  document.getElementById('s5q-popup-body').innerHTML = cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s5q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s5ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState5() {
  syncPracticeProgressNav(document.getElementById('s5'));
  document.getElementById('s5q-popup')?.classList.add('hidden');
  s5CloseHint();
  s5CloseTips();
  if (s5Done) {
    if (s5Outcome === 'wrong2') { s5View = 'solution'; s5RevealSolution(); }
    s5Render();
    const btn = document.getElementById('s5q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s5q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s5Render();
}
function s5ReopenPopup() {
  if (s5Outcome === 'wrong2') { s5View = 'solution'; s5ApplyView(); }
  else if (s5Outcome) s5ShowPopup(s5Outcome);
}
function s5ClosePopups() {
  document.getElementById('s5q-popup')?.classList.add('hidden');
  s5CloseHint();
  s5CloseTips();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s5OpenHint() {
  if (s5Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('003', 'q1');
  document.getElementById('s5q-hint-overlay')?.classList.remove('hidden');
}
function s5CloseHint() { document.getElementById('s5q-hint-overlay')?.classList.add('hidden'); }
function s5CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s5CloseHint(); }

/* "?" ליד "תלול": הקשה/ריחוף/פוקוס פותחים; Escape / לחיצה בחוץ סוגרים */
function s5CloseTips() {
  document.getElementById('s5-tip')?.classList.add('hidden');
  document.getElementById('s5-info')?.setAttribute('aria-expanded', 'false');
}
function s5ShowTip(e) {
  if (e) e.stopPropagation();
  document.getElementById('s5-tip')?.classList.remove('hidden');
  document.getElementById('s5-info')?.setAttribute('aria-expanded', 'true');
}
document.addEventListener('click', function (e) {
  if (!e.target.closest || (!e.target.closest('#s5-info') && !e.target.closest('#s5-tip'))) s5CloseTips();
});

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s5PopupDrag = null;
function s5PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s5q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s5PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s5PopupMove, { passive: false });
  document.addEventListener('pointerup', s5PopupUp);
  document.addEventListener('pointercancel', s5PopupUp);
  e.preventDefault();
}
function s5PopupMove(e) {
  if (!s5PopupDrag || e.pointerId !== s5PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s5PopupUp(e); return; }
  const popup = document.getElementById('s5q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s5PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s5PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, 1280 - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, 710 - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s5PopupUp(e) {
  if (s5PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s5PopupDrag.id) return;
  s5PopupDrag = null;
  document.removeEventListener('pointermove', s5PopupMove);
  document.removeEventListener('pointerup', s5PopupUp);
  document.removeEventListener('pointercancel', s5PopupUp);
}


/* =========================================================
   מסך 7 (#s6) — שאלת גרירה: יצוף / ישקע, שאלה 4 מתוך 4 (שקף 48) — DragAndDropQuestion, וריאנט מקומי
   (אזורים מרובי-פריטים, כמו מסך 20 בסיין 1; מנגנון createPointerDnd / gesture / popup משותף למסכים 4–5).
   מפתח לפי הערת המפיקה: יצוף — רפסודה מעץ אלון, כדור עופרת חלול, בקבוק זכוכית;
   ישקע — גולת זכוכית מלאה, כדור עופרת מלא.
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • בדיקה נפתחת כשכל 5 הכרטיסים הונחו; Retry gate אחרי שגוי לא-סופי: "צדקתי?" כבוי עד שההנחה שונה
     בפועל מההנחה השגויה האחרונה (השוואה חיה של מצב ההנחה המלא).
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על אזור מניחה, הקשה על המגש מחזירה.
   ========================================================= */
const S6 = {
  order: ['hollowlead', 'marble', 'raft', 'solidlead', 'bottle'],
  correct: { raft: 'float', hollowlead: 'float', bottle: 'float', marble: 'sink', solidlead: 'sink' },
  zoneName: { float: 'يطفو', sink: 'يغرق' },
  maxAttempts: 2
};
const S6_EXPLAIN = [
  'الطوّافة المصنوعة من خشب البلوط تطفو لأن كثافة الخشب (0.7 غرام/سم³) أقل من كثافة الماء.',
  'كرة رصاص مجوفة وقنينة زجاجية فارغة ومغلقة تحتويان أيضًا على هواء. الهواء يقلل من الكثافة المتوسطة للجسم ككل، ولذلك يمكن أن تطفوا رغم أنهما مصنوعتان من مادة كثافتها أعلى من كثافة الماء.',
  'في المقابل، كرة الزجاج المليئة وكرة الرصاص المليئة لا تحتويان على هواء، ولذلك تكون كثافتهما عالية وهما تغرقان.'
];
const S6_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S6_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S6_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};

const s6Placement = {};       // cardId → 'source' | 'float' | 'sink'
S6.order.forEach(function (id) { s6Placement[id] = 'source'; });
let s6Marks = {};             // cardId → 'correct' | 'wrong' (אחרי בדיקה)
let s6Selected = null;        // כרטיס שנבחר בהקשה/מקלדת
let s6Attempts = 0;
let s6Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s6Outcome = null;         // 'correct' | 'wrong2'
let s6LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s6Partial = false;        // לפחות כרטיס אחד במקום הנכון אך לא כולם → "התשובה נכונה חלקית." (כלל קבוע בשאלות גרירה)
let s6Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s6View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s6Dnd = null;

function s6Snapshot() { return JSON.stringify(S6.order.map(function (id) { return s6Placement[id]; })); }
function s6AllPlaced() { return S6.order.every(function (id) { return s6Placement[id] !== 'source'; }); }
function s6Say(msg) { const el = document.getElementById('s6-live'); if (el) el.textContent = msg; }
function s6CardLabel(id) { return document.querySelector('#s6-d-' + id + ' .s6-card__name').textContent; }

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function s6DismissRetry() {
  if (s6Done) return;
  s6Marks = {};
  document.getElementById('s6q-popup')?.classList.add('hidden');
}

function s6Render() {
  S6.order.forEach(function (id) {
    const src = document.getElementById('s6-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s6Placement[id] !== 'source');
    src.classList.toggle('is-locked', s6Done);
    const sel = s6Selected === id;
    src.classList.toggle('is-selected', sel && s6Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s6Done ? 'true' : 'false');
  });
  ['float', 'sink'].forEach(function (z) {
    const zone = document.getElementById('s6-zone-' + z);
    zone.querySelectorAll('.s6-card').forEach(function (c) { c.remove(); });
    let n = 0;
    S6.order.forEach(function (id) {
      if (s6Placement[id] !== z) return;
      n++;
      const chip = document.createElement('div');
      chip.className = 's6-card is-placed';
      chip.dataset.id = id;
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
      icon.className = 's6-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 's6-card__text';
      text.innerHTML = document.querySelector('#s6-d-' + id + ' .s6-card__text').innerHTML;
      chip.appendChild(icon);
      chip.appendChild(text);
      const srcImg = document.querySelector('#s6-d-' + id + ' .s6-card__img');
      if (srcImg) chip.appendChild(srcImg.cloneNode(true));   /* התמונה נשארת גם אחרי ההנחה */
      chip.classList.toggle('is-selected', s6Selected === id);
      chip.classList.toggle('is-locked', s6Done);
      chip.setAttribute('aria-pressed', s6Selected === id ? 'true' : 'false');
      chip.setAttribute('aria-label', s6CardLabel(id) + ' — في منطقة ' + S6.zoneName[z] +
        (s6Marks[id] === 'correct' ? '، صحيح' : s6Marks[id] === 'wrong' ? '، غير صحيح' : ''));
      if (s6Marks[id]) chip.classList.add(s6Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
      zone.appendChild(chip);
      if (!s6Done && s6Dnd) s6Dnd.attachSource(chip, id);
      chip.addEventListener('keydown', s6CardKey);
    });
    zone.classList.toggle('occupied', n > 0);
    zone.classList.toggle('is-locked', s6Done);
  });
  s6UpdateCheck();
}

function s6UpdateCheck() {
  if (s6Done) return;
  const btn = document.getElementById('s6q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s6AllPlaced() || (s6LastWrong !== null && s6Snapshot() === s6LastWrong);
}

function s6InitDnd() {
  if (s6Dnd) return;
  s6Dnd = createPointerDnd({
    canDrag: function () { return !s6Done; },
    onPick: function (id) {
      dndGhStop('s6', true);
      s6DismissRetry();
      s6Selected = null;
      if (s6Placement[id] !== 'source') { s6Placement[id] = 'source'; }
      s6Render();
      document.getElementById('s6-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) {
      s6Placement[id] = zone;
      s6Say(s6CardLabel(id) + ' وُضِع في المنطقة ' + S6.zoneName[zone]);
      s6Render();
    },
    onCancel: function () { s6Render(); },
    onTap: function (id) { s6Tap(id); }
  });
  S6.order.forEach(function (id) { s6Dnd.attachSource(document.getElementById('s6-d-' + id), id); });
  document.querySelectorAll('#s6 .s6-zone').forEach(function (z) { s6Dnd.attachTarget(z, z.dataset.zone); });
  document.querySelectorAll('#s6 .s6-card').forEach(function (c) { c.addEventListener('keydown', s6CardKey); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על אזור */
function s6Tap(id) {
  if (s6Done) return;
  dndGhStop('s6', true);
  s6DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על כרטיס שכבר מונח באזור → זו הנחה באותו אזור */
  if (s6Selected && s6Selected !== id && s6Placement[id] !== 'source') {
    const moved = s6Selected;
    s6Selected = null;
    s6Placement[moved] = s6Placement[id];
    s6Say(s6CardLabel(moved) + ' وُضِع في المنطقة ' + S6.zoneName[s6Placement[moved]]);
    s6Render();
    return;
  }
  s6Selected = (s6Selected === id) ? null : id;
  s6Say(s6Selected ? s6CardLabel(id) + ' تم الاختيار. اختاروا منطقة: سيطفو أو سيغرق.' : '');
  s6Render();
}
function s6CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s6Tap(e.currentTarget.dataset.id);
}
function s6ZoneClick(z, e) {
  if (e && e.target.closest && e.target.closest('.s6-card')) return; // הקשה על כרטיס מטופלת ב-s6Tap
  if (s6Done || !s6Selected) return;
  s6DismissRetry();
  const id = s6Selected;
  s6Selected = null;
  s6Placement[id] = z;
  s6Say(s6CardLabel(id) + ' وُضِع في المنطقة ' + S6.zoneName[z]);
  s6Render();
}
function s6ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s6ZoneClick(z);
}
function s6TrayClick(e) {
  if (s6Done || !s6Selected || (e.target.closest && e.target.closest('.s6-card'))) return;
  if (s6Placement[s6Selected] === 'source') return;
  s6DismissRetry();
  s6Placement[s6Selected] = 'source';
  s6Say(s6CardLabel(s6Selected) + ' تمت إعادته إلى الصينية');
  s6Selected = null;
  s6Render();
}

function s6Check() {
  if (s6Done) { advanceScreen(); return; }
  if (!s6AllPlaced()) return;
  s6Selected = null;
  s6Attempts++;
  document.getElementById('s6q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  const okCount = S6.order.filter(function (id) { return s6Placement[id] === S6.correct[id]; }).length;
  const ok = okCount === S6.order.length;
  /* xAPI: matching — placed cards only, both sides as catalogue indexes: S6.order is the catalogue's
     answers.source order (the card shows the body's name, the catalogue string adds its density);
     target 0 יצוף, 1 ישקע. */
  xapiAnswered('004', 'q1', ok, ok || s6Attempts >= S6.maxAttempts, { pairs: S6.order.filter(function (id) { return s6Placement[id] !== 'source'; }).map(function (id) { return { source: S6.order.indexOf(id), target: s6Placement[id] === 'float' ? 0 : 1 }; }) });
  s6Partial = okCount > 0 && !ok;
  if (ok) {
    s6Done = true;
    s6Outcome = 'correct';
    S6.order.forEach(function (id) { s6Marks[id] = 'correct'; });
    s6Render();
    s6ShowPopup('correct');
    s6Finish();
  } else if (s6Attempts >= S6.maxAttempts) {
    s6Done = true;
    s6Outcome = 'wrong2';
    s6Answer = Object.assign({}, s6Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s6View = 'solution';
    s6ApplyView();
    s6Finish();
  } else {
    s6LastWrong = s6Snapshot();
    /* חיווי per-כרטיס גם אחרי ניסיון ראשון: מה נגרר נכון ומה לא; נמחק כשהלומד מתחיל לתקן */
    S6.order.forEach(function (id) { s6Marks[id] = (s6Placement[id] === S6.correct[id]) ? 'correct' : 'wrong'; });
    s6Render();
    s6ShowPopup('retry');
    const btn = document.getElementById('s6q-check');
    if (btn) btn.disabled = true; // Retry gate
    s6Say((s6Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s6Finish() {
  const btn = document.getElementById('s6q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s6q-hint')?.classList.add('s3q-hint-done');
  s6CloseHint();
  syncPracticeProgressNav(document.getElementById('s6'));
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s6ApplyView() {
  if (s6Answer === null) return;
  if (s6View === 'answer') {
    Object.assign(s6Placement, s6Answer);
    S6.order.forEach(function (id) { s6Marks[id] = (s6Placement[id] === S6.correct[id]) ? 'correct' : 'wrong'; });
  } else {
    Object.assign(s6Placement, S6.correct);
    S6.order.forEach(function (id) { s6Marks[id] = 'correct'; });
  }
  s6Render();
  s6ShowPopup('wrong2', s6View);
}
function s6ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s6Answer === null) return;
  s6View = (s6View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s6ApplyView();
}

function s6ShowPopup(type, view) {
  const cfg = S6_FEEDBACK[type];
  const popup = document.getElementById('s6q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, action = cfg.action || null;
  /* נכון על חלק מהפריטים (לא כולם) → "התשובה נכונה חלקית." במקום "אינה נכונה" גורף */
  if (s6Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s6Partial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;  // הכפתור מתחלף
    title = title.split('<br>')[0];  // בתצוגת תשובת הלומד הפתרון לא מוצג
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s6q-popup-title').innerHTML = title;
  document.getElementById('s6q-popup-body').innerHTML = cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s6q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s6ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState6() {
  syncPracticeProgressNav(document.getElementById('s6'));
  s6InitDnd();
  document.getElementById('s6q-popup')?.classList.add('hidden');
  s6CloseHint();
  s6Selected = null;
  if (s6Done) {
    if (s6Outcome === 'wrong2') {
      s6View = 'solution';
      Object.assign(s6Placement, S6.correct);
      S6.order.forEach(function (id) { s6Marks[id] = 'correct'; });
    }
    s6Render();
    const btn = document.getElementById('s6q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s6q-hint')?.classList.add('s3q-hint-done');
    return;
  }
  s6Render();
}
function s6ReopenPopup() {
  if (s6Outcome === 'wrong2') { s6View = 'solution'; s6ApplyView(); }
  else if (s6Outcome) s6ShowPopup(s6Outcome);
}
function s6ClosePopups() {
  document.getElementById('s6q-popup')?.classList.add('hidden');
  s6CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s6OpenHint() {
  if (s6Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s6q-hint-overlay')?.classList.remove('hidden');
}
function s6CloseHint() { document.getElementById('s6q-hint-overlay')?.classList.add('hidden'); }
function s6CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s6CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s6PopupDrag = null;
function s6PopupDown(e) {
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
  s6PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s6PopupMove, { passive: false });
  document.addEventListener('pointerup', s6PopupUp);
  document.addEventListener('pointercancel', s6PopupUp);
  e.preventDefault();
}
function s6PopupMove(e) {
  if (!s6PopupDrag || e.pointerId !== s6PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s6PopupUp(e); return; }
  const popup = document.getElementById('s6q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s6PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s6PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s6PopupUp(e) {
  if (s6PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s6PopupDrag.id) return;
  s6PopupDrag = null;
  document.removeEventListener('pointermove', s6PopupMove);
  document.removeEventListener('pointerup', s6PopupUp);
  document.removeEventListener('pointercancel', s6PopupUp);
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
    (image.closest('.s8-img-frame') || frame).appendChild(button);
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


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (7) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['001', 4],
  4: ['002', 1],
  5: ['003', 1],
  6: ['004', 1]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-02';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1, '002': 1, '003': 1, '004': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-02.json';
var XAPI_END_BTN = 's6q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = ['001/q1', '001/q2', '002/q1', '003/q1', '003/q2', '003/q3', '003/q4', '004/q1'];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
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
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-03/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (45 in this part, listed by the generator from the top-level let/const declarations,
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
      s2qAttempts: _rsPack(s2qAttempts),
      s2qDone: _rsPack(s2qDone),
      s2qOutcome: _rsPack(s2qOutcome),
      s2qLastWrong: _rsPack(s2qLastWrong),
      s2qAnswer: _rsPack(s2qAnswer),
      s2qView: _rsPack(s2qView),
      s2qPartial: _rsPack(s2qPartial),
      practiceProgress: _rsPack(practiceProgress),
      s3Placement: _rsPack(s3Placement),
      s3Marks: _rsPack(s3Marks),
      s3Selected: _rsPack(s3Selected),
      s3Attempts: _rsPack(s3Attempts),
      s3Done: _rsPack(s3Done),
      s3Outcome: _rsPack(s3Outcome),
      s3LastWrong: _rsPack(s3LastWrong),
      s3Partial: _rsPack(s3Partial),
      s3Answer: _rsPack(s3Answer),
      s3View: _rsPack(s3View),
      s4Placement: _rsPack(s4Placement),
      s4Marks: _rsPack(s4Marks),
      s4Selected: _rsPack(s4Selected),
      s4Attempts: _rsPack(s4Attempts),
      s4Done: _rsPack(s4Done),
      s4Outcome: _rsPack(s4Outcome),
      s4LastWrong: _rsPack(s4LastWrong),
      s4Answer: _rsPack(s4Answer),
      s4View: _rsPack(s4View),
      s5Sel: _rsPack(s5Sel),
      s5Marks: _rsPack(s5Marks),
      s5Attempts: _rsPack(s5Attempts),
      s5Done: _rsPack(s5Done),
      s5Outcome: _rsPack(s5Outcome),
      s5LastWrong: _rsPack(s5LastWrong),
      s5Answer: _rsPack(s5Answer),
      s5View: _rsPack(s5View),
      s6Placement: _rsPack(s6Placement),
      s6Marks: _rsPack(s6Marks),
      s6Selected: _rsPack(s6Selected),
      s6Attempts: _rsPack(s6Attempts),
      s6Done: _rsPack(s6Done),
      s6Outcome: _rsPack(s6Outcome),
      s6LastWrong: _rsPack(s6LastWrong),
      s6Partial: _rsPack(s6Partial),
      s6Answer: _rsPack(s6Answer),
      s6View: _rsPack(s6View)
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
  if (has('s2qAttempts')) s2qAttempts = _rsUnpack(v.s2qAttempts);
  if (has('s2qDone')) s2qDone = _rsUnpack(v.s2qDone);
  if (has('s2qOutcome')) s2qOutcome = _rsUnpack(v.s2qOutcome);
  if (has('s2qLastWrong')) s2qLastWrong = _rsUnpack(v.s2qLastWrong);
  if (has('s2qAnswer')) s2qAnswer = _rsUnpack(v.s2qAnswer);
  if (has('s2qView')) s2qView = _rsUnpack(v.s2qView);
  if (has('s2qPartial')) s2qPartial = _rsUnpack(v.s2qPartial);
  if (has('s3Marks')) s3Marks = _rsUnpack(v.s3Marks);
  if (has('s3Selected')) s3Selected = _rsUnpack(v.s3Selected);
  if (has('s3Attempts')) s3Attempts = _rsUnpack(v.s3Attempts);
  if (has('s3Done')) s3Done = _rsUnpack(v.s3Done);
  if (has('s3Outcome')) s3Outcome = _rsUnpack(v.s3Outcome);
  if (has('s3LastWrong')) s3LastWrong = _rsUnpack(v.s3LastWrong);
  if (has('s3Partial')) s3Partial = _rsUnpack(v.s3Partial);
  if (has('s3Answer')) s3Answer = _rsUnpack(v.s3Answer);
  if (has('s3View')) s3View = _rsUnpack(v.s3View);
  if (has('s4Marks')) s4Marks = _rsUnpack(v.s4Marks);
  if (has('s4Selected')) s4Selected = _rsUnpack(v.s4Selected);
  if (has('s4Attempts')) s4Attempts = _rsUnpack(v.s4Attempts);
  if (has('s4Done')) s4Done = _rsUnpack(v.s4Done);
  if (has('s4Outcome')) s4Outcome = _rsUnpack(v.s4Outcome);
  if (has('s4LastWrong')) s4LastWrong = _rsUnpack(v.s4LastWrong);
  if (has('s4Answer')) s4Answer = _rsUnpack(v.s4Answer);
  if (has('s4View')) s4View = _rsUnpack(v.s4View);
  if (has('s5Sel')) s5Sel = _rsUnpack(v.s5Sel);
  if (has('s5Marks')) s5Marks = _rsUnpack(v.s5Marks);
  if (has('s5Attempts')) s5Attempts = _rsUnpack(v.s5Attempts);
  if (has('s5Done')) s5Done = _rsUnpack(v.s5Done);
  if (has('s5Outcome')) s5Outcome = _rsUnpack(v.s5Outcome);
  if (has('s5LastWrong')) s5LastWrong = _rsUnpack(v.s5LastWrong);
  if (has('s5Answer')) s5Answer = _rsUnpack(v.s5Answer);
  if (has('s5View')) s5View = _rsUnpack(v.s5View);
  if (has('s6Marks')) s6Marks = _rsUnpack(v.s6Marks);
  if (has('s6Selected')) s6Selected = _rsUnpack(v.s6Selected);
  if (has('s6Attempts')) s6Attempts = _rsUnpack(v.s6Attempts);
  if (has('s6Done')) s6Done = _rsUnpack(v.s6Done);
  if (has('s6Outcome')) s6Outcome = _rsUnpack(v.s6Outcome);
  if (has('s6LastWrong')) s6LastWrong = _rsUnpack(v.s6LastWrong);
  if (has('s6Partial')) s6Partial = _rsUnpack(v.s6Partial);
  if (has('s6Answer')) s6Answer = _rsUnpack(v.s6Answer);
  if (has('s6View')) s6View = _rsUnpack(v.s6View);
  if (has('practiceProgress') && v.practiceProgress && typeof v.practiceProgress === 'object') _rsAssign(practiceProgress, _rsUnpack(v.practiceProgress));
  if (has('s3Placement') && v.s3Placement && typeof v.s3Placement === 'object') _rsAssign(s3Placement, _rsUnpack(v.s3Placement));
  if (has('s4Placement') && v.s4Placement && typeof v.s4Placement === 'object') _rsAssign(s4Placement, _rsUnpack(v.s4Placement));
  if (has('s6Placement') && v.s6Placement && typeof v.s6Placement === 'object') _rsAssign(s6Placement, _rsUnpack(v.s6Placement));
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
    case 2: /* value input — the typed values come back through applyResumeDom; the solved view from resetScreenState2 */
      if (s2qDone) { var rp = rsFn('s2qReopenPopup'); if (rp) rp(); }
      else { if (s2qAttempts > 0 && s2qLastWrong !== null && s2qSignature() === s2qLastWrong) { s2qMarkAll(s2qValues()); s2qShowPopup('retry'); } s2qUpdateCheck(); } break;
    case 3: rsPaintDnd({ done: s3Done, att: s3Attempts, lw: s3LastWrong, out: s3Outcome, render: rsFn('s3Render'), snap: rsFn('s3Snapshot'),
      update: rsFn('s3UpdateCheck'), showPopup: rsFn('s3ShowPopup'), reopen: rsFn('s3ReopenPopup'), hint: 's3q-hint' }); break;
    case 4: rsPaintDnd({ done: s4Done, att: s4Attempts, lw: s4LastWrong, out: s4Outcome, render: rsFn('s4Render'), snap: rsFn('s4Snapshot'),
      update: rsFn('s4UpdateCheck'), showPopup: rsFn('s4ShowPopup'), reopen: rsFn('s4ReopenPopup'), hint: 's4q-hint' }); break;
    case 5: /* true / false rows — s5Render paints from s5Sel + s5Marks (resetScreenState5 already ran) */
      if (s5Done) { var rp5 = rsFn('s5ReopenPopup'); if (rp5) rp5(); }
      else { s5Render(); if (s5Attempts > 0) { rsHintOn('s5q-hint'); if (s5LastWrong !== null && s5Snapshot() === s5LastWrong) s5ShowPopup('retry'); } s5UpdateCheck(); } break;
    case 6: rsPaintDnd({ done: s6Done, att: s6Attempts, lw: s6LastWrong, out: s6Outcome, render: rsFn('s6Render'), snap: rsFn('s6Snapshot'),
      update: rsFn('s6UpdateCheck'), showPopup: rsFn('s6ShowPopup'), reopen: rsFn('s6ReopenPopup'), hint: 's6q-hint' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

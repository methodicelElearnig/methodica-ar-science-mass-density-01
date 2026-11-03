'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling (הקנבס ממלא את ה-viewport, כמו סיינים 1–5), ניווט מסכים, סטייט גלובלי.
   מסך 1 = TransitionScreen (שקף 78); מסך 2 = FullImageWithTextOverlay (שקף 79);
   מסך 3 = DropdownQuestion + טבלה (שקף 80, שאלת שיא ב׳ — סעיף 1 מתוך 4); מסך 4 = OrderedDragAndDropQuestion (שקף 81);
   מסך 5 = SingleChoiceQuestion בלי תמונה (שקף 82); מסך 6 = SingleChoiceQuestionImage (שקף 83).
   ========================================================= */

const TOTAL_SCREENS = 6;
let currentScreen = 0;

/* הדמות שתיבחר במסך הראשון (אם קיים) נשמרת ב-localStorage (כל סיין הוא מסמך HTML נפרד);
   try/catch: בפתיחה מ-file:// חלק מהדפדפנים חוסמים גישה ל-localStorage */
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

/* הקנבס ממלא את כל ה-viewport (כמו סיין 5): scale = min של שני היחסים, ו-#app מתרחב כך שאין פסים לבנים.
   התוכן מוסט ב---ex למרכז מסגרת ה-1280. */
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
  return {
    w: parseFloat(app.style.width) || CANVAS_W,
    h: parseFloat(app.style.height) || CANVAS_H
  };
}
function getAppScale() {
  const app = document.getElementById('app');
  const m = app.style.transform.match(/scale\(([^)]+)\)/);
  return m ? parseFloat(m[1]) : 1;
}

function goTo(n, viaBack) {
  dndGhStopAll();
  if (n < 0 || n >= TOTAL_SCREENS) return;
  s7ClosePopups(); s3ClosePopups(); s4qClosePopups(); s5qClosePopups(); // פופאפ המשוב + רמז contextual למסך (נסגרים בכל ניווט)
  if (currentScreen === 0 && n !== 0) { const v = document.getElementById('s0-char-video'); if (v) v.pause(); }
  if (currentScreen === 1 && n !== 1) s1AudioStop(); // קריינות מסך 2 נעצרת ביציאה
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
  if (viaBack && n === 2 && s7Done) s7ReopenPopup(); // חזרה למסך פתור — המשוב נפתח מחדש
  if (viaBack && n === 3 && s3Done) s3ReopenPopup();
  if (viaBack && n === 4 && s4qDone) s4qReopenPopup();
  if (viaBack && n === 5 && s5qDone) s5qReopenPopup();
  if (window.Motion) Motion.reveal(target);
  /* 720 platform layer (guide §6.7 / §8.3 / §8.4a): repaint an answered screen on EVERY navigation,
     open/close the catalogue item, arm the debounced state save. All typeof-guarded and swallowed —
     a reporting failure can never stop the learner. */
  try { if (typeof repaintScreen === 'function') repaintScreen(n); } catch (e) {}
  try { if (typeof xapiOnScreen === 'function') xapiOnScreen(n); } catch (e) {}
  try { if (typeof scheduleResumeSave === 'function') scheduleResumeSave(); } catch (e) {}
}

/* animation-system: קריאה נוספת חד-פעמית למסך הראשוני בטעינת העמוד (goTo לא רץ על המסך שכבר active-מלכתחילה) */
if (window.Motion) Motion.reveal(document.querySelector('.screen.active'));

/* מסך 2: הסרטון מתנגן 2 שניות ונעצר על הפריים (בלי לולאה) */
const S1_FREEZE_AT = 2;
(function () {
  const v = document.getElementById('s1-video');
  if (!v) return;
  v.addEventListener('timeupdate', function () {
    if (v.currentTime >= S1_FREEZE_AT && !v.paused) v.pause();
  });
})();
/* קריינות מסך 2 (בקשת לקוחה): מתחילה 1.5 שנ' אחרי הכניסה למסך; כפתור ההשמעה/עצירה נותן ללומד שליטה.
   בסיומה נשארת עצורה — לחיצה משמיעה מההתחלה. */
const S1_AUDIO_DELAY = 1500;
let s1AudioTimer = null;
function s1AudioSync() {
  const a = document.getElementById('s1-audio');
  const btn = document.getElementById('s1-play');
  if (!a || !btn) return;
  const paused = a.paused || a.ended;
  btn.classList.toggle('is-paused', paused);
  btn.setAttribute('aria-label', paused ? 'السرد الصوتي' : 'إيقاف السرد');
}
function s1AudioStop() {
  clearTimeout(s1AudioTimer);
  const a = document.getElementById('s1-audio');
  if (a) { a.pause(); a.currentTime = 0; }
  s1AudioSync();
}
(function () {
  const a = document.getElementById('s1-audio');
  const btn = document.getElementById('s1-play');
  if (!a) return;
  ['play', 'pause', 'ended'].forEach(function (ev) { a.addEventListener(ev, s1AudioSync); });
  if (btn) btn.addEventListener('click', function () {
    clearTimeout(s1AudioTimer); // לחיצה במהלך ההמתנה — מתחיל מיד / מבטל
    if (a.paused || a.ended) {
      if (a.ended) a.currentTime = 0;
      a.play().catch(function () {});
    } else a.pause();
  });
})();

function resetScreenState1() {
  const v = document.getElementById('s1-video');
  s1AudioStop();
  s1AudioTimer = setTimeout(function () {
    const a = document.getElementById('s1-audio');
    if (a) a.play().catch(function () {});
  }, S1_AUDIO_DELAY);
  if (!v) return;
  v.currentTime = 0;
  v.play().catch(function () {});
}

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState7();
  if (n === 3) resetScreenState3();
  if (n === 4) resetScreenState4();
  if (n === 5) resetScreenState5();
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
  if (currentScreen === 2 && !s7Done) return; // מסך 3: ההמשך רק אחרי פתרון (מוצג כ"שנמשיך?")
  if (currentScreen === 3 && !s3Done) return; // מסך 4
  if (currentScreen === 4 && !s4qDone) return; // מסך 5
  if (currentScreen === 5 && !s5qDone) return; // מסך 6
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } /* the last click of the unit: component completed, then stop */
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') { s7CloseHint(); s5qCloseHint(); }
});

/* ---------- מסך 1 (TransitionScreen, שקף 70): סטטי, מנגן את הדמות ---------- */
function playS0Video() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
function resetScreenState0() { playS0Video(); }
playS0Video(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

/* =========================================================
   מסך 3 (#s2) — DropdownQuestion × 2 משפטי השלמה + טבלה (שקף 80). שאלת שיא ב׳ — סעיף 1 מתוך 4. לוגיקה מועתקת מסיין 3 מסך 5 (s4*).
   • נכון: "ציפה" = נמוכה, "צלילה" = גבוהה. נכון רק כששניהם נכונים. 2 ניסיונות (משותפים), רמז זמין מההתחלה.
   • שגוי לא-סופי: הדרופדאון הנכון מסומן בירוק (✓) והשגוי באדום (✗); הערך הנכון של השגוי לא נחשף. Retry gate: "צדקתי?" כבוי עד ששגוי אחד לפחות שונה.
   • שגוי סופי: הפתרון מוצג + View My Answer Toggle; חזרה למסך פתור — תמיד בתצוגת הפתרון.
   ========================================================= */
const S7_EXPLAIN = ['يمكن التحكم في طفو وغوص الغواصة عن طريق تغيير كثافتها المتوسطة.', 'يبقى الحجم الخارجي ثابتًا، لكن الكتلة تتغير، وبالتالي تتغير أيضًا الكثافة المتوسطة.'];
const S7Q = { correct: { 1: 'منخفضة', 2: 'عالية' }, maxAttempts: 2 };
const S7_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
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

let s7Selected = { 1: null, 2: null };
let s7LastWrong = { 1: null, 2: null }; // Retry gate — הבחירות שסומנו שגויות בניסיון הלא-סופי האחרון
let s7Attempts = 0;
let s7Done = false;
let s7Outcome = null;     // 'correct' | 'wrong2'
let s7Partial = false;    // דרופדאון אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s7Answer = null;      // צילום בחירות הלומד בשגוי הסופי
let s7View = 'solution';

function s7Btn(i) { return document.getElementById('dq-btn-7' + i); }
function s7List(i) { return document.getElementById('dq-list-7' + i); }
function s7Say(msg) { const el = document.getElementById('s7-live'); if (el) el.textContent = msg; }
function s7OpenIdx() { return [1, 2].find(function (i) { const l = s7List(i); return l && !l.classList.contains('hidden'); }) || null; }

function s7Open(i) {
  if (s7Done) return;
  s7Close();
  s7DismissRetry();
  s7List(i).classList.remove('hidden');
  s7Btn(i).setAttribute('aria-expanded', 'true');
  s7List(i).querySelectorAll('.dq-option').forEach(function (o) {
    o.classList.toggle('is-selected', o.dataset.value === s7Selected[i]);
  });
}
function s7Close() {
  [1, 2].forEach(function (i) {
    const list = s7List(i), btn = s7Btn(i);
    if (list) list.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  });
}
function s7Toggle(i) {
  if (s7Done) return;
  if (s7List(i).classList.contains('hidden')) s7Open(i); else s7Close();
}
function s7Select(i, value) {
  if (s7Done) return;
  s7DismissRetry();
  s7Selected[i] = value;
  s7ClearMark(i); // בחירה חדשה מבטלת את החיווי הקודם של אותו דרופדאון
  const btn = s7Btn(i);
  btn.removeAttribute('data-empty');
  document.getElementById('dq-selected-7' + i).textContent = value;
  s7Close();
  btn.focus();
  s7Say('تم الاختيار: ' + value);
  s7UpdateCheck();
}
function s7UpdateCheck() {
  if (s7Done) return;
  const btn = document.getElementById('s7q-check');
  if (!btn) return;
  const filled = s7Selected[1] !== null && s7Selected[2] !== null;
  const hadRetry = s7LastWrong[1] !== null || s7LastWrong[2] !== null;
  const changed = [1, 2].some(function (i) { return s7LastWrong[i] !== null && s7Selected[i] !== s7LastWrong[i]; });
  btn.disabled = !filled || (hadRetry && !changed);
}
function s7DismissRetry() {
  if (s7Done) return;
  document.getElementById('s7q-popup')?.classList.add('hidden');
  [1, 2].forEach(function (i) { if (s7LastWrong[i] !== null) s7ClearMark(i); }); // הנכון נשאר ירוק עד לבדיקה הבאה
}
function s7ClearMark(i) {
  const btn = s7Btn(i);
  if (!btn) return;
  btn.classList.remove('dq-correct', 'dq-wrong');
  btn.querySelector('.dq-check-ico')?.remove();
  btn.querySelector('.dq-wrong-ico')?.remove();
}
function s7MarkOne(i, ok) {
  const btn = s7Btn(i);
  s7ClearMark(i);
  btn.classList.add(ok ? 'dq-correct' : 'dq-wrong');
  btn.insertAdjacentHTML('beforeend', ok ? S1_CHECK_SVG : S1_WRONG_SVG);
}
function s7IsRight(i, v) { return v === S7Q.correct[i]; }

/* לחיצה מחוץ לדרופדאון סוגרת רשימה פתוחה */
document.addEventListener('click', function (e) {
  if (e.target.closest && e.target.closest('#s2 .dq-dropdown-wrap')) return;
  s7Close();
});

function s7Check() {
  if (s7Done) { advanceScreen(); return; }
  if (s7Selected[1] === null || s7Selected[2] === null) return;
  s7Close();
  s7Attempts++;
  const ok1 = s7IsRight(1, s7Selected[1]), ok2 = s7IsRight(2, s7Selected[2]);
  s7Partial = ok1 !== ok2;
  /* xAPI: matching — statement i (source index) → the dropdown value (the catalogue target text). */
  xapiAnswered('001', 'q1', ok1 && ok2, (ok1 && ok2) || s7Attempts >= S7Q.maxAttempts, { pairs: [{ source: 0, target: s7Selected[1] }, { source: 1, target: s7Selected[2] }] });
  if (ok1 && ok2) {
    s7Done = true;
    s7Outcome = 'correct';
    s7Lock();
    s7MarkOne(1, true); s7MarkOne(2, true);
    s7ShowPopup('correct');
    s7Finish();
  } else if (s7Attempts >= S7Q.maxAttempts) {
    s7Done = true;
    s7Outcome = 'wrong2';
    s7Answer = { 1: s7Selected[1], 2: s7Selected[2] };
    s7View = 'solution';
    s7Lock();
    s7ApplyView();
    s7Finish();
  } else {
    s7LastWrong = { 1: ok1 ? null : s7Selected[1], 2: ok2 ? null : s7Selected[2] };
    s7MarkOne(1, ok1);
    s7MarkOne(2, ok2);
    s7ShowPopup('retry');
    document.getElementById('s7q-check').disabled = true; // Retry gate
    s7Say((s7Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'هل نحاول مرة أخرى؟');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s7Lock() { s7Btn(1).disabled = true; s7Btn(2).disabled = true; }
function s7Finish() {
  const btn = document.getElementById('s7q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s7q-hint')?.classList.add('s3q-hint-done');
  s7CloseHint();
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s7ApplyView() {
  if (s7Answer === null) return;
  [1, 2].forEach(function (i) {
    const sel = document.getElementById('dq-selected-7' + i);
    if (s7View === 'answer') {
      sel.textContent = s7Answer[i];
      s7MarkOne(i, s7IsRight(i, s7Answer[i]));
    } else {
      sel.textContent = S7Q.correct[i];
      s7MarkOne(i, true);
    }
  });
  s7ShowPopup('wrong2', s7View);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
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
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי"
    title = cfg.answerView.title;
    action = cfg.answerView.action; // המשוב המלא (body) נשאר — מתחלפים רק הכפתור והמשפט "התשובה הנכונה מוצגת"
  }
  if (s7Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s7Partial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.' + (view === 'answer' ? '' : '<br>الإجابة الصحيحة معروضة.');
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
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
  document.getElementById('s7q-popup')?.classList.add('hidden');
  s7CloseHint();
  s7Close();
  if (!s7Done) return; // החיווי של ניסיון לא-סופי נשמר כמו שהוא
  s7Lock();
  [1, 2].forEach(function (i) {
    document.getElementById('dq-selected-7' + i).textContent = S7Q.correct[i];
    s7MarkOne(i, true);
  });
  s7View = 'solution';
  const btn = document.getElementById('s7q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
  document.getElementById('s7q-hint')?.classList.add('s3q-hint-done');
}
function s7ReopenPopup() {
  if (s7Outcome === 'wrong2') { s7View = 'solution'; s7ApplyView(); }
  else if (s7Outcome) s7ShowPopup(s7Outcome);
}
function s7ClosePopups() {
  document.getElementById('s7q-popup')?.classList.add('hidden');
  s7CloseHint();
  s7Close();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s7OpenHint() {
  if (s7Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q1');
  s7Close();
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
  popup.style.left = Math.max(0, Math.min(nx, getCanvasSize().w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, getCanvasSize().h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s7PopupUp(e) {
  if (s7PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s7PopupDrag.id) return;
  s7PopupDrag = null;
  document.removeEventListener('pointermove', s7PopupMove);
  document.removeEventListener('pointerup', s7PopupUp);
  document.removeEventListener('pointercancel', s7PopupUp);
}

const S1_CHECK_SVG = '<img class="dq-check-ico" src="../unit-assets/icons/icon-answerbox-check-green.svg" width="16" height="16" alt="">';
const S1_WRONG_SVG = '<img class="dq-wrong-ico" src="../unit-assets/icons/icon-answerbox-x-red.svg" width="16" height="16" alt="">';

/* חיצים/Enter/Space במקלדת בדרופדאונים */
document.addEventListener('keydown', function (e) {
  const opt = e.target.closest && e.target.closest('.dq-option');
  if (opt && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); opt.click(); return; }
  if (opt && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    const sib = e.key === 'ArrowDown' ? opt.nextElementSibling : opt.previousElementSibling;
    if (sib) sib.focus();
    return;
  }
  const btn = e.target.closest && e.target.closest('#s2 .dq-btn');
  if (btn && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && !s7Done) {
    e.preventDefault();
    const k = btn.id.slice(-1);
    s7Open(k);
    s7List(k).querySelector('.dq-option')?.focus();
  }
  if (e.key === 'Escape' && s7OpenIdx()) { const k = s7OpenIdx(); s7Close(); s7Btn(k)?.focus(); }
});


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
    (image.closest('.s8-img-frame, .s6-img-frame, .s5-img-frame, .qimg-frame') || frame).appendChild(button);
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
   מסך 4 (#s3) — OrderedDragAndDropQuestion (שקף 81, שאלת שיא ב׳ — סעיף 2 מתוך 4). רפרנס: מסך 5 בסיין 5 (s4) — אותו מנגנון/עיצוב.
   סידור 4 שלבים (מילוי מכלי האיזון → מסה גדלה → צפיפות ממוצעת גדלה → הצוללת שוקעת) בסדר הנכון: 4 איזורי גרירה ממוספרים (1–4) מימין,
   4 שלבים (בלי מסיחים) משמאל, מעורבבים. הערת מפיקה: "הסדר בו מופיעים המסיחים הוא הסדר הנכון – יש לערבב" (= סדר השקף, מימין לשמאל).
   • כל שלב יכול להיגרר לכל איזור; איזור מחזיק שלב אחד (שלב שנגרר לאיזור תפוס מפנה את הדייר חזרה לרשימה).
   • בדיקה נפתחת כשכל ארבעת האיזורים מלאים. 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית). אין רמז (אין "אפשר רמז?" בשקף 81).
   • פתרון חלקי: חלק מהאיזורים נכון → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים); אף איזור נכון → "התשובה אינה נכונה במלואה." (טקסט השקף).
   • Retry gate · שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על שלב בוחרת אותו, הקשה/Enter על איזור מניחה, הקשה על הרשימה מחזירה.
   • גלילה: אזור התוכן גולל אנכית; בגרירה — גלילה אוטומטית בקצוות.
   ========================================================= */
const S3 = {
  order: ['a1', 'a2', 'a3', 'a4'],
  zones: ['z1', 'z2', 'z3', 'z4'],
  correct: { z1: 'a1', z2: 'a2', z3: 'a3', z4: 'a4' },   // איזור → שלב
  zoneName: { z1: 'المكان 1', z2: 'المكان 2', z3: 'المكان 3', z4: 'المكان 4' },
  maxAttempts: 2
};
const S3_EXPLAIN = [
  'تَمتلئ أولًا صهاريج الموازنة بمياه البحر، ولذلك تزداد كتلة الغواصة.',
  'بما أن الحجم لا يتغير، فإن الكثافة المتوسطة تزداد، وعندما تصبح أكبر من كثافة مياه البحر، فإن الغواصة تغوص.'
];
const S3_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة ليست صحيحة بالكامل.', body: ['حاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S3_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S3_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      body: ['يمكنكم مشاهدة الحل الصحيح مرة أخرى.'],
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const s3Placement = {};       // stepId → 'source' | zoneId
S3.order.forEach(function (id) { s3Placement[id] = 'source'; });
let s3Marks = {};             // wordId → 'correct' | 'wrong' (אחרי בדיקה)
let s3Selected = null;        // מילה שנבחרה בהקשה/מקלדת
let s3Attempts = 0;
let s3Done = false;           // נעילת החזרה-למסך + שער ההמשך (resolved, לא correctness)
let s3Outcome = null;         // 'correct' | 'wrong2'
let s3LastWrong = null;       // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let s3Partial = false;        // חלל אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s3Answer = null;          // צילום תשובת הלומד בשגוי הסופי
let s3View = 'solution';      // 'solution' | 'answer' — runtime בלבד
let s3Dnd = null;

function s3Occupant(zone, except) {
  return S3.order.find(function (id) { return id !== except && s3Placement[id] === zone; }) || null;
}
function s3Snapshot() { return JSON.stringify(S3.zones.map(function (z) { return s3Occupant(z, null); })); }
function s3AllFilled() { return S3.zones.every(function (z) { return s3Occupant(z, null) !== null; }); }
function s3Say(msg) { const el = document.getElementById('s3-live'); if (el) el.textContent = msg; }
function s3WordLabel(id) { return document.querySelector('#s3-d-' + id + ' .s3-card__text').textContent; }
function s3IsRight(z) { return s3Occupant(z, null) === S3.correct[z]; }
/* הנחת מילה בחלל; אם החלל תפוס — הדייר מוחזר למחסן */
function s3Place(id, zone) {
  const occ = s3Occupant(zone, id);
  if (occ) s3Placement[occ] = 'source';
  s3Placement[id] = zone;
  s3Say(s3WordLabel(id) + ' وُضِعَت في' + S3.zoneName[zone]);
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
  S3.zones.forEach(function (z) {
    const zone = document.getElementById('s3-zone-' + z);
    zone.querySelectorAll('.s3-card').forEach(function (c) { c.remove(); });
    const id = s3Occupant(z, null);
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s3Done);
    zone.classList.remove('is-correct', 'is-wrong');
    if (!id) return;
    const chip = document.createElement('div');
    chip.className = 's3-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
    icon.className = 's3-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 's3-card__text';
    text.textContent = s3WordLabel(id);
    chip.appendChild(icon);
    chip.appendChild(text);
    chip.classList.toggle('is-selected', s3Selected === id);
    chip.classList.toggle('is-locked', s3Done);
    chip.setAttribute('aria-pressed', s3Selected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', s3WordLabel(id) + ' — ب' + S3.zoneName[z] +
      (s3Marks[id] === 'correct' ? '، صحيح' : s3Marks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (s3Marks[id]) {
      const cls = s3Marks[id] === 'correct' ? 'is-correct' : 'is-wrong';
      chip.classList.add(cls);
      zone.classList.add(cls);
    }
    zone.appendChild(chip);
    if (!s3Done && s3Dnd) s3Dnd.attachSource(chip, id);
    chip.addEventListener('keydown', s3CardKey);
  });
  s3UpdateCheck();
}

function s3UpdateCheck() {
  if (s3Done) return;
  const btn = document.getElementById('s3q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s3AllFilled() || (s3LastWrong !== null && s3Snapshot() === s3LastWrong);
}

function s3InitDnd() {
  if (s3Dnd) return;
  s3Dnd = createPointerDnd({
    scrollEl: document.getElementById('s3-scroll'),
    canDrag: function () { return !s3Done; },
    onPick: function (id) {
      dndGhStop('s3', true);
      s3DismissRetry();
      s3Selected = null;
      if (s3Placement[id] !== 'source') s3Placement[id] = 'source';
      s3Render();
      document.getElementById('s3-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s3Place(id, zone); s3Render(); },
    onCancel: function () { s3Render(); },
    onTap: function (id) { s3Tap(id); }
  });
  S3.order.forEach(function (id) {
    const el = document.getElementById('s3-d-' + id);
    s3Dnd.attachSource(el, id);
    el.addEventListener('keydown', s3CardKey);
  });
  S3.zones.forEach(function (z) { s3Dnd.attachTarget(document.getElementById('s3-zone-' + z), z); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על חלל */
function s3Tap(id) {
  dndGhStop('s3', true);
  if (s3Done) return;
  s3DismissRetry();
  /* יש מילה נבחרת והלומד הקיש על מילה שכבר מונחת בחלל → זו הנחה באותו חלל */
  if (s3Selected && s3Selected !== id && s3Placement[id] !== 'source') {
    const moved = s3Selected;
    s3Selected = null;
    s3Place(moved, s3Placement[id]);
    s3Render();
    return;
  }
  s3Selected = (s3Selected === id) ? null : id;
  s3Say(s3Selected ? s3WordLabel(id) + ' تم الاختيار. اختاروا منطقة للوضع.' : '');
  s3Render();
}
function s3CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) s3Tap(id);
}
function s3ZoneClick(z, e) {
  dndGhStop('s3', true);
  if (e && e.target.closest && e.target.closest('.s3-card')) return; // הקשה על מילה מטופלת ב-s3Tap
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
  s3Say(s3WordLabel(s3Selected) + ' تمت إعادته إلى القائمة');
  s3Selected = null;
  s3Render();
}

function s3MarkByZone() {
  s3Marks = {};
  S3.zones.forEach(function (z) {
    const id = s3Occupant(z, null);
    if (id) s3Marks[id] = s3IsRight(z) ? 'correct' : 'wrong';
  });
}

function s3Check() {
  if (s3Done) { advanceScreen(); return; }
  if (!s3AllFilled()) return;
  s3Selected = null;
  s3Attempts++;
  const okCount = S3.zones.filter(s3IsRight).length;
  const ok = okCount === S3.zones.length;
  /* xAPI: sequencing — the step texts in zone order (מקום 1..4). */
  xapiAnswered('001', 'q2', ok, ok || s3Attempts >= S3.maxAttempts, { order: S3.zones.map(function (z) { var id = s3Occupant(z, null); return id ? s3WordLabel(id) : ''; }) });
  s3Partial = okCount > 0 && !ok;
  if (ok) {
    s3Done = true;
    s3Outcome = 'correct';
    s3MarkByZone();
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
    s3MarkByZone(); // חיווי per-חלל גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
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
}

function s3ShowSolution() {
  S3.order.forEach(function (id) { s3Placement[id] = 'source'; });
  S3.zones.forEach(function (z) { s3Placement[S3.correct[z]] = z; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s3ApplyView() {
  if (s3Answer === null) return;
  if (s3View === 'answer') Object.assign(s3Placement, s3Answer);
  else s3ShowSolution();
  s3MarkByZone();
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
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { /* תצוגת "התשובה שלי": המשוב המלא נשאר; מתחלפים רק הכפתור והמשפט "התשובה הנכונה מוצגת" */
    title = cfg.answerView.title;
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהאיזורים (לא כולם) → "התשובה אינה נכונה במלואה." (טקסט השקף) */
  if (s3Partial && type === 'retry') title = 'الإجابة ليست صحيحة بالكامل.';
  if (s3Partial && type === 'wrong2') title = 'الإجابة ليست صحيحة بالكامل.' + (view === 'answer' ? '' : '<br>الإجابة الصحيحة معروضة.');
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
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

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
/* ערבוב סדר המשפטים ברשימה — פעם אחת בטעינת העמוד (הסדר נשמר לאורך הביקור במסך) */
(function s3Shuffle() {
  const tray = document.getElementById('s3-tray');
  if (!tray) return;
  const slots = Array.prototype.slice.call(tray.children);
  const inOrder = function () { return slots.every(function (s, i) { return s.firstElementChild.id === 's3-d-' + S3.order[i]; }); };
  do {
    for (let i = slots.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = slots[i]; slots[i] = slots[j]; slots[j] = t;
    }
  } while (inOrder()); // לא להציג את הסדר הנכון כנקודת פתיחה
  slots.forEach(function (s) { tray.appendChild(s); });
})();

/* גובה האיזור והשלב = גובה השלב הגבוה ביותר (שלב ארוך עוטף לשתי שורות); הרוחב קבוע 521 (Figma). נמדד כשהמסך מוצג */
function s3Fit() {
  const sec = document.getElementById('s3');
  if (!sec) return;
  sec.style.removeProperty('--s3-h'); // מדידת הגובה הטבעי
  let h = 0;
  sec.querySelectorAll('.s3-slot > .s3-card').forEach(function (c) {
    /* שלב שהונח באיזור מוסתר מהרשימה (offsetHeight = 0) — משתמשים בגובה שנמדד כשהיה גלוי */
    if (c.offsetHeight) c.dataset.fitH = c.offsetHeight;
    h = Math.max(h, +c.dataset.fitH || 0);
  });
  if (!h) return; // המסך מוסתר — יימדד בכניסה
  sec.style.setProperty('--s3-h', h + 'px');
}
window.addEventListener('resize', s3Fit);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { requestAnimationFrame(s3Fit); });

function resetScreenState3() {
  requestAnimationFrame(function () { requestAnimationFrame(s3Fit); }); // אחרי שהמסך הופך ל-active
  s3InitDnd();
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3Selected = null;
  if (s3Done) {
    if (s3Outcome === 'wrong2') { s3View = 'solution'; s3ShowSolution(); }
    s3MarkByZone();
    s3Render();
    const btn = document.getElementById('s3q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
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
}


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
  popup.style.left = Math.max(0, Math.min(nx, getCanvasSize().w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, getCanvasSize().h - 74 - popup.offsetHeight)) + 'px';
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
   מסך 5 (#s4) — SingleChoiceQuestion בלי תמונה (שקף 82, שאלת שיא ב׳ — סעיף 3 מתוך 4). לוגיקה כמו מסך 3 בסיין 3 (s2q*).
   correctId='a' (הצפיפות הממוצעת שווה לצפיפות מי הים — מצב ריחוף; הסקה מתוכן האפשרויות, התסריט לא מסמן מפתח), 2 ניסיונות (התסריט שותק),
   אין רמז (אין "אפשר רמז?" בשקף 82). משוב — מילה במילה מהתסריט. אין תווית-המשך בתסריט → 'שנמשיך?' (ברירת-המחדל הקנונית).
   אין View My Answer Toggle (בחירה יחידה מציגה את הנבחרת השגויה ואת הנכונה יחד).
   ========================================================= */
const S4Q = { correctId: 'a', maxAttempts: 2 };
let s4qSelected = null;
let s4qAttempts = 0;
let s4qDone = false;
let s4qOutcome = null;     // 'correct' | 'wrong2'
let s4qLastWrong = null;   // Retry gate

const S4Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا‎!', body: [] },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: ['لا بأس، نتعلم أيضًا من الأخطاء.'] }
};

function s4qOptEl(id) { return document.querySelector('#s4 .s3q-opt[data-id="' + id + '"]'); }
function s4qSelect(id) {
  if (s4qDone) return;
  document.getElementById('s4q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s4 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s4qOptEl(id);
  if (!el) return;
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s4qSelected = id;
  const checkBtn = document.getElementById('s4q-check');
  if (checkBtn) checkBtn.disabled = (s4qLastWrong !== null && id === s4qLastWrong);
}
function s4qMark(id, cls) {
  const el = s4qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s4qShowPopup(type) {
  const cfg = S4Q_POPUP_CFG[type];
  const popup = document.getElementById('s4q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s4q-popup-title').innerHTML = cfg.title;
  document.getElementById('s4q-popup-body').innerHTML =
    cfg.body.map(function (p) { return p.charAt(0) === '<' ? p : '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s4qCheck() {
  if (s4qDone) { advanceScreen(); return; }
  if (!s4qSelected) return;
  s4qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('001', 'q3', s4qSelected === S4Q.correctId, s4qSelected === S4Q.correctId || s4qAttempts >= S4Q.maxAttempts, { choices: [xapiOptIdx(s4qSelected)] });
  if (s4qSelected === S4Q.correctId) {
    s4qMark(S4Q.correctId, 'correct');
    s4qShowPopup('correct');
    s4qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s4qAttempts < S4Q.maxAttempts) {
    s4qMark(s4qSelected, 'wrong');
    s4qLastWrong = s4qSelected;
    s4qShowPopup('retry');
    const checkBtn = document.getElementById('s4q-check');
    if (checkBtn) checkBtn.disabled = true; // Retry gate
  } else {
    s4qMark(s4qSelected, 'wrong');
    s4qMark(S4Q.correctId, 'correct');
    s4qShowPopup('wrong2');
    s4qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s4qFinish(outcome) {
  s4qDone = true;
  s4qOutcome = outcome;
  document.querySelectorAll('#s4 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.setAttribute('aria-disabled', 'true');
  });
  const checkBtn = document.getElementById('s4q-check');
  if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'متابعة'; }
}
/* כניסה למסך: מסך פתור חוזר נעול כמו שהיה; לא פתור — המצב נשמר כמו שהוא */
function resetScreenState4() {
  document.getElementById('s4q-popup')?.classList.add('hidden');
}
function s4qReopenPopup() { if (s4qOutcome) s4qShowPopup(s4qOutcome); }
function s4qClosePopups() {
  document.getElementById('s4q-popup')?.classList.add('hidden');
}

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s4qPopupDrag = null;
function s4qPopupDown(e) {
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
  s4qPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s4qPopupMove, { passive: false });
  document.addEventListener('pointerup', s4qPopupUp);
  document.addEventListener('pointercancel', s4qPopupUp);
  e.preventDefault();
}
function s4qPopupMove(e) {
  if (!s4qPopupDrag || e.pointerId !== s4qPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s4qPopupUp(e); return; }
  const popup = document.getElementById('s4q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s4qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s4qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, getCanvasSize().w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, getCanvasSize().h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s4qPopupUp(e) {
  if (s4qPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s4qPopupDrag.id) return;
  s4qPopupDrag = null;
  document.removeEventListener('pointermove', s4qPopupMove);
  document.removeEventListener('pointerup', s4qPopupUp);
  document.removeEventListener('pointercancel', s4qPopupUp);
}



/* =========================================================
   מסך 6 (#s5) — SingleChoiceQuestionImage (שקף 83, שאלת שיא ב׳ — סעיף 4 מתוך 4). רפרנס: מסך 9 בסיין 1 (s8) + לוגיקת s4q.
   correctId='c' (ציפה נקבעת לפי הצפיפות הממוצעת: 0.99 צפה, 1.04 שוקעת — תואם את משוב השקף), 2 ניסיונות (התסריט שותק), רמז זמין מההתחלה.
   משוב ורמז — מילה במילה מהתסריט. אין תווית-המשך בתסריט → 'שנמשיך?'.
   ========================================================= */
const S5Q = { correctId: 'c', maxAttempts: 2 };
let s5qSelected = null;
let s5qAttempts = 0;
let s5qDone = false;
let s5qOutcome = null;     // 'correct' | 'wrong2'
let s5qLastWrong = null;   // Retry gate

const S5Q_EXPLAIN = [
  'يتم تحديد الطفو والغوص وفقًا للكثافة المتوسطة للغواصة، وليس وفقًا لكثافة المادة التي صُنعت منها.',
  'لتقييم ادّعاء علمي، يجب الاعتماد على البيانات والمبادئ العلمية، وليس على الافتراضات أو السلطة.'
];
const S5Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا‎!', body: S5Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S5Q_EXPLAIN }
};

function s5qOptEl(id) { return document.querySelector('#s5 .s3q-opt[data-id="' + id + '"]'); }
function s5qSelect(id) {
  if (s5qDone) return;
  document.getElementById('s5q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s5 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s5qOptEl(id);
  if (!el) return;
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s5qSelected = id;
  const checkBtn = document.getElementById('s5q-check');
  if (checkBtn) checkBtn.disabled = (s5qLastWrong !== null && id === s5qLastWrong);
}
function s5qMark(id, cls) {
  const el = s5qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s5qShowPopup(type) {
  const cfg = S5Q_POPUP_CFG[type];
  const popup = document.getElementById('s5q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s5q-popup-title').innerHTML = cfg.title;
  document.getElementById('s5q-popup-body').innerHTML =
    cfg.body.map(function (p) { return p.charAt(0) === '<' ? p : '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s5qCheck() {
  if (s5qDone) { advanceScreen(); return; }
  if (!s5qSelected) return;
  s5qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('001', 'q4', s5qSelected === S5Q.correctId, s5qSelected === S5Q.correctId || s5qAttempts >= S5Q.maxAttempts, { choices: [xapiOptIdx(s5qSelected)] });
  if (s5qSelected === S5Q.correctId) {
    s5qMark(S5Q.correctId, 'correct');
    s5qShowPopup('correct');
    s5qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s5qAttempts < S5Q.maxAttempts) {
    s5qMark(s5qSelected, 'wrong');
    s5qLastWrong = s5qSelected;
    s5qShowPopup('retry');
    const checkBtn = document.getElementById('s5q-check');
    if (checkBtn) checkBtn.disabled = true; // Retry gate
  } else {
    s5qMark(s5qSelected, 'wrong');
    s5qMark(S5Q.correctId, 'correct');
    s5qShowPopup('wrong2');
    s5qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s5qFinish(outcome) {
  s5qDone = true;
  s5qOutcome = outcome;
  document.querySelectorAll('#s5 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.setAttribute('aria-disabled', 'true');
  });
  const checkBtn = document.getElementById('s5q-check');
  if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'إنهاء'; }
  document.getElementById('s5q-hint')?.classList.add('s3q-hint-done');
  s5qCloseHint();
}
/* כניסה למסך: מסך פתור חוזר נעול כמו שהיה; לא פתור — המצב נשמר כמו שהוא */
function resetScreenState5() {
  document.getElementById('s5q-popup')?.classList.add('hidden');
  s5qCloseHint();
}
function s5qReopenPopup() { if (s5qOutcome) s5qShowPopup(s5qOutcome); }
function s5qClosePopups() {
  document.getElementById('s5q-popup')?.classList.add('hidden');
  s5qCloseHint();
}
function s5qOpenHint() {
  if (s5qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q4');
  document.getElementById('s5q-hint-overlay')?.classList.remove('hidden');
}
function s5qCloseHint() { document.getElementById('s5q-hint-overlay')?.classList.add('hidden'); }
function s5qCloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s5qCloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s5qPopupDrag = null;
function s5qPopupDown(e) {
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
  s5qPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s5qPopupMove, { passive: false });
  document.addEventListener('pointerup', s5qPopupUp);
  document.addEventListener('pointercancel', s5qPopupUp);
  e.preventDefault();
}
function s5qPopupMove(e) {
  if (!s5qPopupDrag || e.pointerId !== s5qPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s5qPopupUp(e); return; }
  const popup = document.getElementById('s5q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const nx = (e.clientX - rect.left) / scale - s5qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s5qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, getCanvasSize().w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, getCanvasSize().h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s5qPopupUp(e) {
  if (s5qPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s5qPopupDrag.id) return;
  s5qPopupDrag = null;
  document.removeEventListener('pointermove', s5qPopupMove);
  document.removeEventListener('pointerup', s5qPopupUp);
  document.removeEventListener('pointercancel', s5qPopupUp);
}

/* ---------- מחוות-יד (גרירה / לחיצה) — 720-templates → _gesture-hints.md. מועתק ממנגנון סיין 2 (מסכים 4–7).
   שתי נקודות-עוגן אמיתיות מהגיאומטריה החיה (כרטיס מקור ואזור יעד פנוי); היד נעה רק בכיוון המלמד (כרטיס → אזור);
   persistent עד שהלומד מתחיל אינטראקציה בפועל. מסך בחירה (mode: click) — לחיצה במקום אחד, בלי תנועה.
   הדגמה דקורטיבית בלבד — הזוג אינו מפתח תשובה. ---------- */
var DND_GH = {
  s3: { screen: 3, mode: 'drag', stage: '#s3 .s3-inner', card: '#s3-tray .s3-card:not(.is-ghost)', zone: '#s3 .s3-zone:not(.occupied)', done: function () { return s3Done; } }
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
   בדיוק TOTAL_SCREENS מפתחות (6) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['001', 3],
  3: ['001', 4],
  4: ['001', 5],
  5: ['001', 6]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-07';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-07.json';
var XAPI_END_BTN = 's5q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = ['001/q1', '001/q2', '001/q3', '001/q4'];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
var XAPI_PASS = 0.75;

/* תוצאת הרכיב ל-completed (§6.4): correct / all graded catalogue questions this part reports
   (unanswered = wrong), success at XAPI_PASS. No threshold is promised on screen in this part;
   0.75 (3 of 4) is the family rule for a peak question (mass-gas-01 parts 05/06). */
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
  /* last part: no next component (the platform decides what follows) */
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (28 in this part, listed by the generator from the top-level let/const declarations,
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
      s7Selected: _rsPack(s7Selected),
      s7LastWrong: _rsPack(s7LastWrong),
      s7Attempts: _rsPack(s7Attempts),
      s7Done: _rsPack(s7Done),
      s7Outcome: _rsPack(s7Outcome),
      s7Partial: _rsPack(s7Partial),
      s7Answer: _rsPack(s7Answer),
      s7View: _rsPack(s7View),
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
      s4qSelected: _rsPack(s4qSelected),
      s4qAttempts: _rsPack(s4qAttempts),
      s4qDone: _rsPack(s4qDone),
      s4qOutcome: _rsPack(s4qOutcome),
      s4qLastWrong: _rsPack(s4qLastWrong),
      s5qSelected: _rsPack(s5qSelected),
      s5qAttempts: _rsPack(s5qAttempts),
      s5qDone: _rsPack(s5qDone),
      s5qOutcome: _rsPack(s5qOutcome),
      s5qLastWrong: _rsPack(s5qLastWrong)
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
  if (has('s7Selected')) s7Selected = _rsUnpack(v.s7Selected);
  if (has('s7LastWrong')) s7LastWrong = _rsUnpack(v.s7LastWrong);
  if (has('s7Attempts')) s7Attempts = _rsUnpack(v.s7Attempts);
  if (has('s7Done')) s7Done = _rsUnpack(v.s7Done);
  if (has('s7Outcome')) s7Outcome = _rsUnpack(v.s7Outcome);
  if (has('s7Partial')) s7Partial = _rsUnpack(v.s7Partial);
  if (has('s7Answer')) s7Answer = _rsUnpack(v.s7Answer);
  if (has('s7View')) s7View = _rsUnpack(v.s7View);
  if (has('s3Marks')) s3Marks = _rsUnpack(v.s3Marks);
  if (has('s3Selected')) s3Selected = _rsUnpack(v.s3Selected);
  if (has('s3Attempts')) s3Attempts = _rsUnpack(v.s3Attempts);
  if (has('s3Done')) s3Done = _rsUnpack(v.s3Done);
  if (has('s3Outcome')) s3Outcome = _rsUnpack(v.s3Outcome);
  if (has('s3LastWrong')) s3LastWrong = _rsUnpack(v.s3LastWrong);
  if (has('s3Partial')) s3Partial = _rsUnpack(v.s3Partial);
  if (has('s3Answer')) s3Answer = _rsUnpack(v.s3Answer);
  if (has('s3View')) s3View = _rsUnpack(v.s3View);
  if (has('s4qSelected')) s4qSelected = _rsUnpack(v.s4qSelected);
  if (has('s4qAttempts')) s4qAttempts = _rsUnpack(v.s4qAttempts);
  if (has('s4qDone')) s4qDone = _rsUnpack(v.s4qDone);
  if (has('s4qOutcome')) s4qOutcome = _rsUnpack(v.s4qOutcome);
  if (has('s4qLastWrong')) s4qLastWrong = _rsUnpack(v.s4qLastWrong);
  if (has('s5qSelected')) s5qSelected = _rsUnpack(v.s5qSelected);
  if (has('s5qAttempts')) s5qAttempts = _rsUnpack(v.s5qAttempts);
  if (has('s5qDone')) s5qDone = _rsUnpack(v.s5qDone);
  if (has('s5qOutcome')) s5qOutcome = _rsUnpack(v.s5qOutcome);
  if (has('s5qLastWrong')) s5qLastWrong = _rsUnpack(v.s5qLastWrong);
  if (has('s3Placement') && v.s3Placement && typeof v.s3Placement === 'object') _rsAssign(s3Placement, _rsUnpack(v.s3Placement));
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
    case 2: rsPaintDd({ done: s7Done, att: s7Attempts, lw: s7LastWrong, sel: s7Selected, out: s7Outcome, idx: [1, 2], btn: s7Btn, markOne: s7MarkOne,
       update: rsFn('s7UpdateCheck'), showPopup: rsFn('s7ShowPopup'), reopen: rsFn('s7ReopenPopup'), hint: 's7q-hint' }); break;
    case 3: rsPaintDnd({ done: s3Done, att: s3Attempts, lw: s3LastWrong, out: s3Outcome, render: rsFn('s3Render'), snap: rsFn('s3Snapshot'),
      update: rsFn('s3UpdateCheck'), showPopup: rsFn('s3ShowPopup'), reopen: rsFn('s3ReopenPopup'), hint: 's3q-hint' }); break;
    case 4: rsPaintScq({ sel: s4qSelected, done: s4qDone, lw: s4qLastWrong, att: s4qAttempts, out: s4qOutcome, correct: S4Q.correctId,
      mark: s4qMark, finish: s4qFinish, select: rsFn('s4qSelect'), showPopup: rsFn('s4qShowPopup'), reopen: rsFn('s4qReopenPopup'),
      hint: 's4q-hint', check: 's4q-check' }); break;
    case 5: rsPaintScq({ sel: s5qSelected, done: s5qDone, lw: s5qLastWrong, att: s5qAttempts, out: s5qOutcome, correct: S5Q.correctId,
      mark: s5qMark, finish: s5qFinish, select: rsFn('s5qSelect'), showPopup: rsFn('s5qShowPopup'), reopen: rsFn('s5qReopenPopup'),
      hint: 's5q-hint', check: 's5q-check' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

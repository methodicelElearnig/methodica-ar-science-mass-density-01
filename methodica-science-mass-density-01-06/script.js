'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling (הקנבס ממלא את ה-viewport, כמו סיינים 1–5), ניווט מסכים, סטייט גלובלי.
   מסך 1 = TransitionScreen (שקף 70); מסך 2 = FullImageWithTextOverlay + פופאפ גרף (שקפים 71+72).
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
  if (currentScreen === 1 && n !== 1) closeGraphPopup(true);
  s2qClosePopups(); // מסך 3: פופאפ המשוב contextual למסך (נסגר בכל ניווט)
  s74qClosePopups(); // מסך 4: משוב + רמז
  fbdClosePopups(); // מסך 5: פופאפ המשוב
  s3qClosePopups(); // מסך 6: משוב + רמז
  if (currentScreen === 1 && n !== 1) { const sv = document.getElementById('s1-video'); if (sv) { sv.muted = true; sv.pause(); } } // יציאה ממסך הווידאו עם הסאונד: משתיקים לגמרי
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
  if (n === 1) { const sv = document.getElementById('s1-video'); if (sv) sv.play().catch(function () {}); }
  dndGhEnter(n);
  if (viaBack && n === 2 && s2qDone) s2qReopenPopup(); // חזרה למסך פתור — המשוב נפתח מחדש
  if (viaBack && n === 3 && s74qDone) s74qReopenPopup();
  if (viaBack && n === 4 && fbdDone) fbdReopenPopup();
  if (viaBack && n === 5 && s3qDone) s3qReopenPopup();
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

function resetScreenState(n) {
  if (n === 0) resetScreenState0();
  if (n === 1) resetScreenState1();
  if (n === 2) resetScreenState2();
  if (n === 3) resetScreenState74();
  if (n === 4) resetScreenStateFbd();
  if (n === 5) resetScreenState3();
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
  if (currentScreen === 1 && !s1GraphSeen) return; // מסך 2: ההמשך נפתח רק אחרי שהפופאפ נפתח (שקף 72)
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}
document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') { closeGraphPopup(); s74qCloseHint(); s3qCloseHint(); }
});

/* ---------- מסך 1 (TransitionScreen, שקף 70): סטטי, מנגן את הדמות ---------- */
function playS0Video() {
  const vid = document.getElementById('s0-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}
function resetScreenState0() { playS0Video(); }
playS0Video(); // המסך הראשוני active מלכתחילה — goTo לא רץ עליו

/* =========================================================
   מסך 2 — פופאפ הגרף (שקף 72)
   s1GraphSeen: נעשה true בפתיחה הראשונה → "המשך" נפתח ונשאר פתוח (גם אחרי סגירה וחזרה למסך).
   ========================================================= */
let s1GraphSeen = false;
let graphOpener = null;
let graphVideoWasPlaying = false; /* הסרטון נעצר על פריים קפוא בזמן הפופאפ (לא מפריע לקריאה) וממשיך בסגירה */

function resetScreenState1() {
  closeGraphPopup(true);
  document.getElementById('s1-continue').disabled = !s1GraphSeen;
}

function openGraphPopup() {
  graphOpener = document.activeElement;
  document.getElementById('graph-popup-backdrop').classList.remove('hidden');
  document.querySelector('.flag-btn')?.classList.add('flag-btn--popup');
  var gv = document.getElementById('s1-video');
  graphVideoWasPlaying = !!(gv && !gv.paused && !gv.ended);
  if (graphVideoWasPlaying) gv.pause();
  s1GraphSeen = true;
  document.getElementById('s1-continue').disabled = false;
  document.getElementById('graph-popup-close').focus();
}
function closeGraphPopup(silent) {
  const bd = document.getElementById('graph-popup-backdrop');
  if (!bd || bd.classList.contains('hidden')) return;
  graphCloseTips();
  bd.classList.add('hidden');
  document.querySelector('.flag-btn')?.classList.remove('flag-btn--popup');
  if (graphVideoWasPlaying && !silent) {
    var gv = document.getElementById('s1-video');
    if (gv) gv.play().catch(function () {});
  }
  graphVideoWasPlaying = false;
  if (!silent && graphOpener && graphOpener.focus) graphOpener.focus();
}
function closeGraphPopupOnBackdrop(e) {
  if (e.target === e.currentTarget) closeGraphPopup();
}

/* כפתורי "?" על עמודות הגרף — הסבר אחד פתוח בכל רגע; לחיצה חוזרת / מחוץ לכפתור סוגרת */
function graphCloseTips() {
  document.querySelectorAll('.s1-q-btn').forEach(function (b) {
    b.setAttribute('aria-expanded', 'false');
    document.getElementById(b.getAttribute('aria-controls')).hidden = true;
  });
}
function graphToggleTip(e, btn) {
  e.stopPropagation();
  const wasOpen = btn.getAttribute('aria-expanded') === 'true';
  graphCloseTips();
  if (wasOpen) return;
  btn.setAttribute('aria-expanded', 'true');
  document.getElementById(btn.getAttribute('aria-controls')).hidden = false;
}

/* =========================================================
   מסך 3 — שאלת בחירה יחידה עם תרשים (SingleChoiceQuestionImage, שקף 73)
   תבנית: 720-templates → SingleChoiceQuestion.md + _question-template-defaults.md.
   לוגיקה זהה למסך 9 בסיין 1 (s8q*), בלי רמז (אין רמז בתסריט).
   correctId='b' (פוליפרופילן ופוליאתילן יצופו; פי-וי-סי ופוליאסטר ישקעו), maxAttempts=2.
   אין סרגל התקדמות. אין View My Answer Toggle.
   ========================================================= */
const S2Q = { correctId: 'b', maxAttempts: 2 };
let s2qSelected = null;
let s2qAttempts = 0;
let s2qDone = false;
let s2qLastWrong = null;   // Retry gate
let s2qLastOutcome = null; // 'correct' | 'wrong2' — שחזור פופאפ בחזרה (Back)

/* משוב — נוסח התסריט כלשונו (שקף 73). correct/wrong2 חולקים את גוף ההסבר; הכותרת של wrong2
   כפי שמופיעה בתסריט ("התשובה אינה נכונה."). רקעים: correct #f2ffe8, שגוי #ffdbdc. */
const S2Q_EXPLAIN = [
  'البولي بروبلين والبولي إيثيلين <strong>سيطفوان،</strong> لأن كثافتهما أقل من كثافة مياه البحر (1.03 جرام لكل سم³).',
  'بولي فينيل كلوريد (PVC) والبوليستر <strong>سيغوصان،</strong> لأن كثافتهما أعلى من كثافة مياه البحر.'
];
const S2Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S2Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S2Q_EXPLAIN }
};

function s2qOptEl(id) {
  return document.querySelector('#s2 .s3q-opt[data-id="' + id + '"]');
}

function s2qSelect(id) {
  if (s2qDone) return;
  /* בחירה-מחדש מסלקת את פופאפ ה-retry ומנקה סימון-שגוי קודם */
  document.getElementById('s2q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s2 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s2qOptEl(id);
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

function s2qResetPopupPosition() {
  const popup = document.getElementById('s2q-popup');
  if (!popup) return;
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}

function s2qShowPopup(type) {
  const cfg = S2Q_POPUP_CFG[type];
  const popup = document.getElementById('s2q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  s2qResetPopupPosition();
  document.getElementById('s2q-popup-title').innerHTML = cfg.title;
  document.getElementById('s2q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}

function s2qReopenPopup() {
  if (s2qLastOutcome) s2qShowPopup(s2qLastOutcome);
}

function s2qCheck() {
  if (s2qDone) { advanceScreen(); return; } /* הכפתור הופך לפעולת-ההמשך אחרי פתרון */
  if (!s2qSelected) return;
  s2qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('001', 'q1', s2qSelected === S2Q.correctId, s2qSelected === S2Q.correctId || s2qAttempts >= S2Q.maxAttempts, { choices: [xapiOptIdx(s2qSelected)] });
  if (s2qSelected === S2Q.correctId) {
    s2qMark(S2Q.correctId, 'correct');
    s2qShowPopup('correct');
    s2qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s2qAttempts < S2Q.maxAttempts) {
    /* ניסיון ראשון שגוי — retry, הנכונה לא נחשפת */
    s2qMark(s2qSelected, 'wrong');
    s2qLastWrong = s2qSelected;
    s2qShowPopup('retry');
    const checkBtn = document.getElementById('s2q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    /* ניסיון סופי שגוי — חושף את הנכונה, נועל */
    s2qMark(s2qSelected, 'wrong');
    s2qMark(S2Q.correctId, 'correct');
    s2qShowPopup('wrong2');
    s2qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s2qFinish(outcome) {
  s2qDone = true;
  s2qLastOutcome = outcome;
  document.querySelectorAll('#s2 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s2q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    /* אין תווית-המשך מאושרת בתסריט → ברירת-המחדל הקנונית של התבנית */
    checkBtn.textContent = 'متابعة';
  }
}

/* ניווט מסך 3 מסלק את פופאפ המשוב (contextual to screen) */
function s2qClosePopups() {
  document.getElementById('s2q-popup')?.classList.add('hidden');
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s2qPopupDrag = null;
function s2qPopupMouseDown(e) {
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft;
  const top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s2qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s2qPopupDrag) return;
  const popup = document.getElementById('s2q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s2qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s2qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s2qPopupDrag = null; });

/* resume-state lock: ה-DOM לא נהרס בין מסכים, ולכן אין מה לאפס בכניסה חוזרת.
   שחזור הפופאפ בחזרה (Back) למסך פתור — ב-goTo. */
function resetScreenState2() {
  // no-op מתועד
}

/* =========================================================
   מסך 6 — שאלת בחירה יחידה עם תמונה (SingleChoiceQuestionImage, שקף 76)
   לוגיקה זהה למסך 3 (s2q*) + רמז זמין מההתחלה (גוף בלבד → כותרת גנרית). correctId='c', maxAttempts=2.
   אין סרגל התקדמות / View My Answer Toggle.
   ========================================================= */
const S3Q = { correctId: 'c', maxAttempts: 2 };
let s3qSelected = null;
let s3qAttempts = 0;
let s3qDone = false;
let s3qLastWrong = null;   // Retry gate
let s3qLastOutcome = null; // 'correct' | 'wrong2' — שחזור פופאפ בחזרה (Back)

/* משוב — נוסח התסריט כלשונו (שקף 76). correct/wrong2 חולקים את גוף ההסבר; הכותרת של wrong2
   כפי שמופיעה בתסריט ("התשובה אינה נכונה."). רקעים: correct #f2ffe8, שגוי #ffdbdc. */
const S3Q_EXPLAIN = [
  'لإثبات حجة علمية يتم أولًا جمع الأدلة، وعندها فقط يتم التوصل إلى استنتاج. أخذ عينات من عدة أعماق هو الطريقة الوحيدة لفحص الادعاء، لأن مادتي PVC والبوليستر أكثر كثافة من مياه البحر وتغوصان إلى القاع.<br>شبكة ممدودة على سطح البحر لن تجمعهما إطلاقًا.'
];
const S3Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S3Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S3Q_EXPLAIN }
};

function s3qOptEl(id) {
  return document.querySelector('#s3 .s3q-opt[data-id="' + id + '"]');
}

function s3qSelect(id) {
  if (s3qDone) return;
  /* בחירה-מחדש מסלקת את פופאפ ה-retry ומנקה סימון-שגוי קודם */
  document.getElementById('s3q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s3 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s3qOptEl(id);
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s3qSelected = id;
  const checkBtn = document.getElementById('s3q-check');
  if (checkBtn) checkBtn.disabled = (s3qLastWrong !== null && id === s3qLastWrong);
}

function s3qMark(id, cls) {
  const el = s3qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}

function s3qResetPopupPosition() {
  const popup = document.getElementById('s3q-popup');
  if (!popup) return;
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}

function s3qShowPopup(type) {
  const cfg = S3Q_POPUP_CFG[type];
  const popup = document.getElementById('s3q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  s3qResetPopupPosition();
  document.getElementById('s3q-popup-title').innerHTML = cfg.title;
  document.getElementById('s3q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}

function s3qReopenPopup() {
  if (s3qLastOutcome) s3qShowPopup(s3qLastOutcome);
}

function s3qCheck() {
  if (s3qDone) { advanceScreen(); return; } /* הכפתור הופך לפעולת-ההמשך אחרי פתרון */
  if (!s3qSelected) return;
  s3qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('001', 'q4', s3qSelected === S3Q.correctId, s3qSelected === S3Q.correctId || s3qAttempts >= S3Q.maxAttempts, { choices: [xapiOptIdx(s3qSelected)] });
  if (s3qSelected === S3Q.correctId) {
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('correct');
    s3qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s3qAttempts < S3Q.maxAttempts) {
    /* ניסיון ראשון שגוי — retry, הנכונה לא נחשפת */
    s3qMark(s3qSelected, 'wrong');
    s3qLastWrong = s3qSelected;
    s3qShowPopup('retry');
    const checkBtn = document.getElementById('s3q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    /* ניסיון סופי שגוי — חושף את הנכונה, נועל */
    s3qMark(s3qSelected, 'wrong');
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('wrong2');
    s3qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s3qFinish(outcome) {
  s3qDone = true;
  document.getElementById('s3q-hint')?.classList.add('s8q-hint-done');
  s3qCloseHint();
  s3qLastOutcome = outcome;
  document.querySelectorAll('#s3 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s3q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    /* המסך האחרון בסיין (בקשת לקוחה): "סיימתי" במקום "שנמשיך?" */
    checkBtn.textContent = 'انتهيت';
  }
}

/* רמז — זמין מההתחלה, ניתן לפתיחה חוזרת עד לפתרון. סגירה: כפתור / לחיצה מחוץ / Escape (בלי X). */
function s3qOpenHint() {
  if (s3qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q4');
  document.getElementById('s3q-hint-overlay')?.classList.remove('hidden');
}
function s3qCloseHint() {
  document.getElementById('s3q-hint-overlay')?.classList.add('hidden');
}
function s3qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s3qCloseHint();
}

/* ניווט מסך 6 מסלק את פופאפ המשוב (contextual to screen) */
function s3qClosePopups() {
  document.getElementById('s3q-popup')?.classList.add('hidden');
  s3qCloseHint();
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s3qPopupDrag = null;
function s3qPopupMouseDown(e) {
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft;
  const top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s3qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s3qPopupDrag) return;
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s3qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s3qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s3qPopupDrag = null; });

/* resume-state lock (כמו מסך 3) — אין מה לאפס בכניסה חוזרת */
function resetScreenState3() {
  // no-op מתועד
}


/* =========================================================
   מסך 4 — שאלת בחירה יחידה עם תרשים (SingleChoiceQuestionImage, שקף 74)
   לוגיקה זהה למסך 3 (s2q*) + רמז זמין מההתחלה (גוף בלבד → כותרת גנרית). correctId='c' (פוליאתילן), maxAttempts=2.
   אין סרגל התקדמות / View My Answer Toggle.
   ========================================================= */
const S74Q = { correctId: 'c', maxAttempts: 2 };
let s74qSelected = null;
let s74qAttempts = 0;
let s74qDone = false;
let s74qLastWrong = null;   // Retry gate
let s74qLastOutcome = null; // 'correct' | 'wrong2' — שחזור פופאפ בחזרה (Back)

/* משוב — נוסח התסריט כלשונו (שקף 74). correct/wrong2 חולקים את גוף ההסבר; הכותרת של wrong2
   כפי שמופיעה בתסריט ("התשובה אינה נכונה."). רקעים: correct #f2ffe8, שגוי #ffdbdc. */
const S74Q_EXPLAIN = [
  'لتحديد نوع البلاستيك، يجب أولًا حساب كثافته ثم مقارنتها بالقيم الموضحة في الرسم البياني.'
];
const S74Q_POPUP_CFG = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S74Q_EXPLAIN },
  wrong2:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S74Q_EXPLAIN }
};

function s74qOptEl(id) {
  return document.querySelector('#s74 .s3q-opt[data-id="' + id + '"]');
}

function s74qSelect(id) {
  if (s74qDone) return;
  /* בחירה-מחדש מסלקת את פופאפ ה-retry ומנקה סימון-שגוי קודם */
  document.getElementById('s74q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s74 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s74qOptEl(id);
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s74qSelected = id;
  const checkBtn = document.getElementById('s74q-check');
  if (checkBtn) checkBtn.disabled = (s74qLastWrong !== null && id === s74qLastWrong);
}

function s74qMark(id, cls) {
  const el = s74qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}

function s74qResetPopupPosition() {
  const popup = document.getElementById('s74q-popup');
  if (!popup) return;
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}

function s74qShowPopup(type) {
  const cfg = S74Q_POPUP_CFG[type];
  const popup = document.getElementById('s74q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  s74qResetPopupPosition();
  document.getElementById('s74q-popup-title').innerHTML = cfg.title;
  document.getElementById('s74q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}

function s74qReopenPopup() {
  if (s74qLastOutcome) s74qShowPopup(s74qLastOutcome);
}

function s74qCheck() {
  if (s74qDone) { advanceScreen(); return; } /* הכפתור הופך לפעולת-ההמשך אחרי פתרון */
  if (!s74qSelected) return;
  s74qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('001', 'q2', s74qSelected === S74Q.correctId, s74qSelected === S74Q.correctId || s74qAttempts >= S74Q.maxAttempts, { choices: [xapiOptIdx(s74qSelected)] });
  if (s74qSelected === S74Q.correctId) {
    s74qMark(S74Q.correctId, 'correct');
    s74qShowPopup('correct');
    s74qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s74qAttempts < S74Q.maxAttempts) {
    /* ניסיון ראשון שגוי — retry, הנכונה לא נחשפת */
    s74qMark(s74qSelected, 'wrong');
    s74qLastWrong = s74qSelected;
    s74qShowPopup('retry');
    const checkBtn = document.getElementById('s74q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    /* ניסיון סופי שגוי — חושף את הנכונה, נועל */
    s74qMark(s74qSelected, 'wrong');
    s74qMark(S74Q.correctId, 'correct');
    s74qShowPopup('wrong2');
    s74qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s74qFinish(outcome) {
  s74qDone = true;
  document.getElementById('s74q-hint')?.classList.add('s8q-hint-done');
  s74qCloseHint();
  s74qLastOutcome = outcome;
  document.querySelectorAll('#s74 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s74q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    /* אין תווית-המשך מאושרת בתסריט → ברירת-המחדל הקנונית של התבנית */
    checkBtn.textContent = 'متابعة';
  }
}

/* רמז — זמין מההתחלה, ניתן לפתיחה חוזרת עד לפתרון. סגירה: כפתור / לחיצה מחוץ / Escape (בלי X). */
function s74qOpenHint() {
  if (s74qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('001', 'q2');
  document.getElementById('s74q-hint-overlay')?.classList.remove('hidden');
}
function s74qCloseHint() {
  document.getElementById('s74q-hint-overlay')?.classList.add('hidden');
}
function s74qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s74qCloseHint();
}

/* ניווט מסך 4 מסלק את פופאפ המשוב (contextual to screen) */
function s74qClosePopups() {
  document.getElementById('s74q-popup')?.classList.add('hidden');
  s74qCloseHint();
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s74qPopupDrag = null;
function s74qPopupMouseDown(e) {
  const popup = document.getElementById('s74q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft;
  const top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s74qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s74qPopupDrag) return;
  const popup = document.getElementById('s74q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s74qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s74qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s74qPopupDrag = null; });

/* resume-state lock (כמו מסך 3) — אין מה לאפס בכניסה חוזרת */
function resetScreenState74() {
  // no-op מתועד
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
   מסך 5 (#s75, שקף 75) — DragAndDropQuestion, וריאנט מקומי "השלמת פסקה" (שאלת שיא א׳ — סעיף 3 מתוך 4).
   רפרנס: סיין 5 מסך 2 (מנגנון Pointer-DnD, סימון מצבים, פופאפ משוב, View My Answer Toggle). בלי סרגל התקדמות; בלי רמז (אין בתסריט).
   • 6 חללים בתוך שתי פסקאות + מחסן של 6 מילים (בלי מסיחים). כל מילה יכולה להיגרר לכל חלל; חלל מחזיק מילה אחת (מילה שנגררת לחלל תפוס מפנה את הדייר).
   • מפתח לפי הפתרון בשקף (מימין לשמאל): פסקה 1 — פוליפרופילן · פוליאתילן · נמוכה; פסקה 2 — פוליאסטר · פי-וי-סי · גבוהה.
     שני סוגי הפלסטיק בכל משפט — סדרם חופשי (accept), כי שניהם נכונים מדעית; החשיפה מציגה את סדר השקף.
   • בדיקה נפתחת כשכל ששת החללים מלאים. 2 ניסיונות; Retry gate; נכון חלקית → "התשובה נכונה חלקית." (כלל קבוע בשאלות מרובות-חלקים).
   • שגוי סופי: הפתרון מוצג מיד + "מעבר לתשובה שלי" (הערת מפיקה); חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על מילה בוחרת אותה, הקשה/Enter על חלל מניחה, הקשה על המחסן מחזירה.
   ========================================================= */
const FBD = {
  words: ['pe', 'high', 'pp', 'pvc', 'low', 'pes'],
  zones: ['z1', 'z2', 'z3', 'z4', 'z5', 'z6'],
  solution: { z1: 'pp', z2: 'pe', z3: 'low', z4: 'pes', z5: 'pvc', z6: 'high' },   // חלל → מילה (סדר השקף)
  accept:   { z1: ['pp', 'pe'], z2: ['pp', 'pe'], z3: ['low'], z4: ['pes', 'pvc'], z5: ['pes', 'pvc'], z6: ['high'] },
  zoneName: { z1: 'فراغ 1', z2: 'فراغ 2', z3: 'فراغ 3', z4: 'فراغ 4', z5: 'فراغ 5', z6: 'فراغ 6' },
  maxAttempts: 2
};
const FBD_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز!', body: ['أكملتم الفقرة بنجاح وفقًا للبيانات الواردة في الرسم البياني.'] },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['الإجابات الصحيحة تظهر الآن.'],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: {
      title: 'الإجابة غير صحيحة.',
      action: { label: 'الإجابة الصحيحة', view: 'solution' }
    }
  }
};

const fbdPlacement = {};      // wordId → 'source' | zoneId
FBD.words.forEach(function (id) { fbdPlacement[id] = 'source'; });
let fbdMarks = {};            // wordId → 'correct' | 'wrong' (אחרי בדיקה)
let fbdSelected = null;       // מילה שנבחרה בהקשה/מקלדת
let fbdAttempts = 0;
let fbdDone = false;          // נעילת המסך + שער ההמשך (resolved, לא correctness)
let fbdOutcome = null;        // 'correct' | 'wrong2'
let fbdLastWrong = null;      // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון (Retry gate)
let fbdPartial = false;       // לפחות חלל אחד נכון אך לא כולם → "התשובה נכונה חלקית."
let fbdAnswer = null;         // צילום תשובת הלומד בשגוי הסופי
let fbdView = 'solution';     // 'solution' | 'answer' — runtime בלבד
let fbdDnd = null;

function fbdOccupant(zone, except) {
  return FBD.words.find(function (id) { return id !== except && fbdPlacement[id] === zone; }) || null;
}
function fbdSnapshot() { return JSON.stringify(FBD.zones.map(function (z) { return fbdOccupant(z, null); })); }
function fbdAllFilled() { return FBD.zones.every(function (z) { return fbdOccupant(z, null) !== null; }); }
function fbdSay(msg) { const el = document.getElementById('fbd-live'); if (el) el.textContent = msg; }
function fbdWordLabel(id) { return document.querySelector('#fbd-d-' + id + ' .fbd-card__text').textContent; }
function fbdIsRight(z) { const id = fbdOccupant(z, null); return id !== null && FBD.accept[z].indexOf(id) !== -1; }
/* הנחת מילה בחלל; אם החלל תפוס — הדייר מוחזר למחסן */
function fbdPlace(id, zone) {
  const occ = fbdOccupant(zone, id);
  if (occ) fbdPlacement[occ] = 'source';
  fbdPlacement[id] = zone;
  fbdSay(fbdWordLabel(id) + ' وُضِعَت في' + FBD.zoneName[zone]);
}

/* ניסיון חדש מתחיל → משוב ה-retry וסימוני הניסיון הקודם כבר לא מתארים את המצב */
function fbdDismissRetry() {
  if (fbdDone) return;
  fbdMarks = {};
  document.getElementById('fbd-popup')?.classList.add('hidden');
}

function fbdRender() {
  FBD.words.forEach(function (id) {
    const src = document.getElementById('fbd-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', fbdPlacement[id] !== 'source');
    src.classList.toggle('is-locked', fbdDone);
    const sel = fbdSelected === id;
    src.classList.toggle('is-selected', sel && fbdPlacement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', fbdDone ? 'true' : 'false');
    src.setAttribute('tabindex', fbdPlacement[id] === 'source' ? '0' : '-1');
  });
  FBD.zones.forEach(function (z) {
    const zone = document.getElementById('fbd-zone-' + z);
    zone.querySelectorAll('.fbd-card').forEach(function (c) { c.remove(); });
    const id = fbdOccupant(z, null);
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', fbdDone);
    zone.classList.remove('is-correct', 'is-wrong');
    if (!id) return;
    const chip = document.createElement('span');
    chip.className = 'fbd-card is-placed';
    chip.dataset.id = id;
    chip.setAttribute('role', 'button');
    chip.tabIndex = 0;
    const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL) */
    icon.className = 'fbd-card__icon';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.className = 'fbd-card__text';
    text.textContent = fbdWordLabel(id);
    chip.appendChild(icon);
    chip.appendChild(text);
    chip.classList.toggle('is-selected', fbdSelected === id);
    chip.classList.toggle('is-locked', fbdDone);
    chip.setAttribute('aria-pressed', fbdSelected === id ? 'true' : 'false');
    chip.setAttribute('aria-label', fbdWordLabel(id) + ' — ب' + FBD.zoneName[z] +
      (fbdMarks[id] === 'correct' ? '، صحيح' : fbdMarks[id] === 'wrong' ? '، غير صحيح' : ''));
    if (fbdMarks[id]) {
      const cls = fbdMarks[id] === 'correct' ? 'is-correct' : 'is-wrong';
      chip.classList.add(cls);
      zone.classList.add(cls);
    }
    zone.appendChild(chip);
    if (!fbdDone && fbdDnd) fbdDnd.attachSource(chip, id);
    chip.addEventListener('keydown', fbdCardKey);
  });
  fbdUpdateCheck();
}

function fbdUpdateCheck() {
  if (fbdDone) return;
  const btn = document.getElementById('fbd-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !fbdAllFilled() || (fbdLastWrong !== null && fbdSnapshot() === fbdLastWrong);
}

function fbdInitDnd() {
  if (fbdDnd) return;
  fbdDnd = createPointerDnd({
    canDrag: function () { return !fbdDone; },
    onPick: function (id) {
      dndGhStop('fbd', true);
      fbdDismissRetry();
      fbdSelected = null;
      if (fbdPlacement[id] !== 'source') fbdPlacement[id] = 'source';
      fbdRender();
      document.getElementById('fbd-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { fbdPlace(id, zone); fbdRender(); },
    onCancel: function () { fbdRender(); },
    onTap: function (id) { fbdTap(id); }
  });
  FBD.words.forEach(function (id) {
    const el = document.getElementById('fbd-d-' + id);
    fbdDnd.attachSource(el, id);
    el.addEventListener('keydown', fbdCardKey);
  });
  FBD.zones.forEach(function (z) { fbdDnd.attachTarget(document.getElementById('fbd-zone-' + z), z); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על חלל */
function fbdTap(id) {
  dndGhStop('fbd', true);
  if (fbdDone) return;
  fbdDismissRetry();
  /* יש מילה נבחרת והלומד הקיש על מילה שכבר מונחת בחלל → זו הנחה באותו חלל */
  if (fbdSelected && fbdSelected !== id && fbdPlacement[id] !== 'source') {
    const moved = fbdSelected;
    fbdSelected = null;
    fbdPlace(moved, fbdPlacement[id]);
    fbdRender();
    return;
  }
  fbdSelected = (fbdSelected === id) ? null : id;
  fbdSay(fbdSelected ? fbdWordLabel(id) + ' تم اختيارها. اختاروا فراغًا للوضع.' : '');
  fbdRender();
}
function fbdCardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  const id = e.currentTarget.dataset.id || e.currentTarget.dataset.pdragId;
  if (id) fbdTap(id);
}
function fbdZoneClick(z, e) {
  dndGhStop('fbd', true);
  if (e && e.target.closest && e.target.closest('.fbd-card')) return; // הקשה על מילה מטופלת ב-fbdTap
  if (fbdDone || !fbdSelected) return;
  fbdDismissRetry();
  const id = fbdSelected;
  fbdSelected = null;
  fbdPlace(id, z);
  fbdRender();
}
function fbdZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  fbdZoneClick(z);
}
function fbdTrayClick(e) {
  if (fbdDone || !fbdSelected || (e.target.closest && e.target.closest('.fbd-card'))) return;
  if (fbdPlacement[fbdSelected] === 'source') return;
  fbdDismissRetry();
  fbdPlacement[fbdSelected] = 'source';
  fbdSay(fbdWordLabel(fbdSelected) + ' تم إرجاعها إلى المخزن');
  fbdSelected = null;
  fbdRender();
}

function fbdMarkByZone() {
  fbdMarks = {};
  FBD.zones.forEach(function (z) {
    const id = fbdOccupant(z, null);
    if (id) fbdMarks[id] = fbdIsRight(z) ? 'correct' : 'wrong';
  });
}

function fbdCheck() {
  if (fbdDone) { advanceScreen(); return; }
  if (!fbdAllFilled()) return;
  fbdSelected = null;
  fbdAttempts++;
  const okCount = FBD.zones.filter(fbdIsRight).length;
  const ok = okCount === FBD.zones.length;
  /* xAPI: matching — the word in each blank; target index = blank order (z1..z6 = the catalogue's 6 targets). */
  xapiAnswered('001', 'q3', ok, ok || fbdAttempts >= FBD.maxAttempts, { pairs: FBD.zones.map(function (z, i) { var id = fbdOccupant(z, null); return id ? { source: fbdWordLabel(id), target: i } : null; }).filter(Boolean) });
  fbdPartial = okCount > 0 && !ok;
  if (ok) {
    fbdDone = true;
    fbdOutcome = 'correct';
    fbdMarkByZone();
    fbdRender();
    fbdShowPopup('correct');
    fbdFinish();
  } else if (fbdAttempts >= FBD.maxAttempts) {
    fbdDone = true;
    fbdOutcome = 'wrong2';
    fbdAnswer = Object.assign({}, fbdPlacement); // צילום לפני שהחשיפה דורסת את ההנחה
    fbdView = 'solution';
    fbdApplyView();
    fbdFinish();
  } else {
    fbdLastWrong = fbdSnapshot();
    fbdMarkByZone(); // חיווי per-חלל גם אחרי ניסיון ראשון; נמחק כשהלומד מתחיל לתקן
    fbdRender();
    fbdShowPopup('retry');
    const btn = document.getElementById('fbd-check');
    if (btn) btn.disabled = true; // Retry gate
    fbdSay((fbdPartial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'حاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function fbdFinish() {
  const btn = document.getElementById('fbd-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
}

function fbdShowSolution() {
  FBD.words.forEach(function (id) { fbdPlacement[id] = 'source'; });
  FBD.zones.forEach(function (z) { fbdPlacement[FBD.solution[z]] = z; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function fbdApplyView() {
  if (fbdAnswer === null) return;
  if (fbdView === 'answer') Object.assign(fbdPlacement, fbdAnswer);
  else fbdShowSolution();
  fbdMarkByZone();
  fbdRender();
  fbdShowPopup('wrong2', fbdView);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
}
function fbdToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (fbdAnswer === null) return;
  fbdView = (fbdView === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  fbdApplyView();
}

function fbdShowPopup(type, view) {
  const cfg = FBD_FEEDBACK[type];
  const popup = document.getElementById('fbd-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (type === 'wrong2' && view === 'answer') { // תצוגת "התשובה שלי": אותה כותרת (בלי החלפת נוסח), בלי שורת "מוצגות כעת", הכפתור מתחלף
    title = cfg.answerView.title;
    body = [];
    action = cfg.answerView.action;
  }
  /* נכון על חלק מהחללים (לא כולם) → "התשובה נכונה חלקית." בשתי התצוגות — כך הכותרת המודגשת לא מתחלפת בלחיצה על הטוגל */
  if (fbdPartial && (type === 'retry' || type === 'wrong2')) title = 'الإجابة صحيحة جزئيًا.';
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('fbd-popup-title').innerHTML = title;
  document.getElementById('fbd-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('fbd-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.innerHTML = '<span class="popup-action__label"></span>';
    b.firstChild.textContent = action.label;
    b.firstChild.dataset.label = action.label; // מקצה מראש רוחב של הטקסט המודגש → hover לא משנה את גודל הכפתור
    b.addEventListener('click', fbdToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון / תשובה נכונה); לא פתור — המצב נשמר כמו שהוא */
function resetScreenStateFbd() {
  fbdInitDnd();
  document.getElementById('fbd-popup')?.classList.add('hidden');
  fbdSelected = null;
  if (fbdDone) {
    if (fbdOutcome === 'wrong2') { fbdView = 'solution'; fbdShowSolution(); }
    fbdMarkByZone();
    fbdRender();
    const btn = document.getElementById('fbd-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    return;
  }
  fbdRender();
}
function fbdReopenPopup() {
  if (fbdOutcome === 'wrong2') { fbdView = 'solution'; fbdApplyView(); }
  else if (fbdOutcome) fbdShowPopup(fbdOutcome);
}
function fbdClosePopups() {
  document.getElementById('fbd-popup')?.classList.add('hidden');
}

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let fbdPopupDrag = null;
function fbdPopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('fbd-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  fbdPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', fbdPopupMove, { passive: false });
  document.addEventListener('pointerup', fbdPopupUp);
  document.addEventListener('pointercancel', fbdPopupUp);
  e.preventDefault();
}
function fbdPopupMove(e) {
  if (!fbdPopupDrag || e.pointerId !== fbdPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { fbdPopupUp(e); return; }
  const popup = document.getElementById('fbd-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - fbdPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - fbdPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function fbdPopupUp(e) {
  if (fbdPopupDrag && e && e.pointerId !== undefined && e.pointerId !== fbdPopupDrag.id) return;
  fbdPopupDrag = null;
  document.removeEventListener('pointermove', fbdPopupMove);
  document.removeEventListener('pointerup', fbdPopupUp);
  document.removeEventListener('pointercancel', fbdPopupUp);
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


/* הווידאו של מסך 2 מושתק לצמיתות (אין כפתור קול). */
(function () {
  var v = document.getElementById('s1-video');
  if (!v) return;
  v.muted = true;
  /* עצירה/הפעלה: הסרטון מנגן פעם אחת ונעצר; כפתור ההפעלה מאפשר צפייה חוזרת */
  var pbtn = document.getElementById('s1-play');
  function syncPlayBtn() {
    if (!pbtn) return;
    var paused = v.paused || v.ended;
    pbtn.classList.toggle('is-paused', paused);
    pbtn.setAttribute('aria-label', paused ? 'تشغيل الفيديو' : 'إيقاف الفيديو');
  }
  v.addEventListener('play', syncPlayBtn);
  v.addEventListener('pause', syncPlayBtn);
  v.addEventListener('ended', syncPlayBtn);
  if (pbtn) pbtn.addEventListener('click', function () {
    if (v.paused || v.ended) {
      if (v.ended) v.currentTime = 0;
      v.play().catch(function () {});
    } else v.pause();
  });
  syncPlayBtn();
  v.play().catch(function () {});
})();

/* ---------- מחוות-יד (גרירה / לחיצה) — 720-templates → _gesture-hints.md. מועתק ממנגנון סיין 2 (מסכים 4–7).
   שתי נקודות-עוגן אמיתיות מהגיאומטריה החיה (כרטיס מקור ואזור יעד פנוי); היד נעה רק בכיוון המלמד (כרטיס → אזור);
   persistent עד שהלומד מתחיל אינטראקציה בפועל. מסך בחירה (mode: click) — לחיצה במקום אחד, בלי תנועה.
   הדגמה דקורטיבית בלבד — הזוג אינו מפתח תשובה. ---------- */
var DND_GH = {
  fbd: { screen: 4, mode: 'drag', stage: '#s75', card: '#fbd-tray .fbd-card:not(.is-ghost)', zone: '#s75 .fbd-zone:not(.occupied)', done: function () { return fbdDone; } }
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

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-06';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '001': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-06.json';
var XAPI_END_BTN = 's3q-check';                               /* the part's last button (D-8, restoreEndedButton) */
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
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-07/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (26 in this part, listed by the generator from the top-level let/const declarations,
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
      s1GraphSeen: _rsPack(s1GraphSeen),
      s2qSelected: _rsPack(s2qSelected),
      s2qAttempts: _rsPack(s2qAttempts),
      s2qDone: _rsPack(s2qDone),
      s2qLastWrong: _rsPack(s2qLastWrong),
      s2qLastOutcome: _rsPack(s2qLastOutcome),
      s3qSelected: _rsPack(s3qSelected),
      s3qAttempts: _rsPack(s3qAttempts),
      s3qDone: _rsPack(s3qDone),
      s3qLastWrong: _rsPack(s3qLastWrong),
      s3qLastOutcome: _rsPack(s3qLastOutcome),
      s74qSelected: _rsPack(s74qSelected),
      s74qAttempts: _rsPack(s74qAttempts),
      s74qDone: _rsPack(s74qDone),
      s74qLastWrong: _rsPack(s74qLastWrong),
      s74qLastOutcome: _rsPack(s74qLastOutcome),
      fbdPlacement: _rsPack(fbdPlacement),
      fbdMarks: _rsPack(fbdMarks),
      fbdSelected: _rsPack(fbdSelected),
      fbdAttempts: _rsPack(fbdAttempts),
      fbdDone: _rsPack(fbdDone),
      fbdOutcome: _rsPack(fbdOutcome),
      fbdLastWrong: _rsPack(fbdLastWrong),
      fbdPartial: _rsPack(fbdPartial),
      fbdAnswer: _rsPack(fbdAnswer),
      fbdView: _rsPack(fbdView)
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
  if (has('s1GraphSeen')) s1GraphSeen = _rsUnpack(v.s1GraphSeen);
  if (has('s2qSelected')) s2qSelected = _rsUnpack(v.s2qSelected);
  if (has('s2qAttempts')) s2qAttempts = _rsUnpack(v.s2qAttempts);
  if (has('s2qDone')) s2qDone = _rsUnpack(v.s2qDone);
  if (has('s2qLastWrong')) s2qLastWrong = _rsUnpack(v.s2qLastWrong);
  if (has('s2qLastOutcome')) s2qLastOutcome = _rsUnpack(v.s2qLastOutcome);
  if (has('s3qSelected')) s3qSelected = _rsUnpack(v.s3qSelected);
  if (has('s3qAttempts')) s3qAttempts = _rsUnpack(v.s3qAttempts);
  if (has('s3qDone')) s3qDone = _rsUnpack(v.s3qDone);
  if (has('s3qLastWrong')) s3qLastWrong = _rsUnpack(v.s3qLastWrong);
  if (has('s3qLastOutcome')) s3qLastOutcome = _rsUnpack(v.s3qLastOutcome);
  if (has('s74qSelected')) s74qSelected = _rsUnpack(v.s74qSelected);
  if (has('s74qAttempts')) s74qAttempts = _rsUnpack(v.s74qAttempts);
  if (has('s74qDone')) s74qDone = _rsUnpack(v.s74qDone);
  if (has('s74qLastWrong')) s74qLastWrong = _rsUnpack(v.s74qLastWrong);
  if (has('s74qLastOutcome')) s74qLastOutcome = _rsUnpack(v.s74qLastOutcome);
  if (has('fbdMarks')) fbdMarks = _rsUnpack(v.fbdMarks);
  if (has('fbdSelected')) fbdSelected = _rsUnpack(v.fbdSelected);
  if (has('fbdAttempts')) fbdAttempts = _rsUnpack(v.fbdAttempts);
  if (has('fbdDone')) fbdDone = _rsUnpack(v.fbdDone);
  if (has('fbdOutcome')) fbdOutcome = _rsUnpack(v.fbdOutcome);
  if (has('fbdLastWrong')) fbdLastWrong = _rsUnpack(v.fbdLastWrong);
  if (has('fbdPartial')) fbdPartial = _rsUnpack(v.fbdPartial);
  if (has('fbdAnswer')) fbdAnswer = _rsUnpack(v.fbdAnswer);
  if (has('fbdView')) fbdView = _rsUnpack(v.fbdView);
  if (has('fbdPlacement') && v.fbdPlacement && typeof v.fbdPlacement === 'object') _rsAssign(fbdPlacement, _rsUnpack(v.fbdPlacement));
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
    case 2: rsPaintScq({ sel: s2qSelected, done: s2qDone, lw: s2qLastWrong, att: s2qAttempts, out: s2qLastOutcome, correct: S2Q.correctId,
      mark: s2qMark, finish: s2qFinish, select: rsFn('s2qSelect'), showPopup: rsFn('s2qShowPopup'), reopen: rsFn('s2qReopenPopup'),
      hint: 's2q-hint', check: 's2q-check' }); break;
    case 3: rsPaintScq({ sel: s74qSelected, done: s74qDone, lw: s74qLastWrong, att: s74qAttempts, out: s74qLastOutcome, correct: S74Q.correctId,
      mark: s74qMark, finish: s74qFinish, select: rsFn('s74qSelect'), showPopup: rsFn('s74qShowPopup'), reopen: rsFn('s74qReopenPopup'),
      hint: 's74q-hint', check: 's74q-check' }); break;
    case 4: rsPaintDnd({ done: fbdDone, att: fbdAttempts, lw: fbdLastWrong, out: fbdOutcome, render: rsFn('fbdRender'), snap: rsFn('fbdSnapshot'),
      update: rsFn('fbdUpdateCheck'), showPopup: rsFn('fbdShowPopup'), reopen: rsFn('fbdReopenPopup'), hint: 'fbd-hint' }); break;
    case 5: rsPaintScq({ sel: s3qSelected, done: s3qDone, lw: s3qLastWrong, att: s3qAttempts, out: s3qLastOutcome, correct: S3Q.correctId,
      mark: s3qMark, finish: s3qFinish, select: rsFn('s3qSelect'), showPopup: rsFn('s3qShowPopup'), reopen: rsFn('s3qReopenPopup'),
      hint: 's3q-hint', check: 's3q-check' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

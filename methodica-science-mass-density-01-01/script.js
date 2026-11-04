'use strict';

/* =========================================================
   מנוע גלובלי — canvas scaling, ניווט מסכים, סטייט גלובלי
   TOTAL_SCREENS יעודכן ל-2+ עם הוספת כל מסך אמיתי.

   ⚠️ ללומדה הזו אין מסך בחירת-דמות (סטייה מכוונת מיעד 2/3 — ראו
   PROJECT_BRIEF.md), ולכן אין כאן window.lomdaState.selectedCharacter
   או localStorage-key לבחירת דמות. דמות מלווה יחידה (ללא בחירה)
   תופיע במסכים מסוימים בהמשך היחידה — כשתמומש, תיפתר כקבוע פשוט
   (נתיב נכס אחד), לא דרך מנגנון ה-asset-map הדו-דמותי המתועד ב-
   720-templates → _global-components.md → "Companion character
   system" (זה מיועד לבחירה בין 2+ דמויות, שלא קיימת כאן). */

const TOTAL_SCREENS = 28;
let currentScreen = 0;

/* הקנבס ממלא את כל ה-viewport (CANVAS-FILL-VIEWPORT.md): ה-scale הוא min של
   שני היחסים (בלי עיוות), ו-#app מתרחב כך שאחרי ה-scale אין פסים לבנים.
   גודל הקנבס בפועל ≥ 1280×710 — אין להניח רוחב/גובה קבועים בקוד. */
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
window.addEventListener('resize', scaleApp);
scaleApp();

function goTo(n, viaBack) {
  if (n < 0 || n >= TOTAL_SCREENS) return;
  if (currentScreen === 0 && n !== 0) { const sv = document.getElementById('s0-video'); if (sv) { sv.muted = true; sv.pause(); } } // יציאה ממסך הווידאו הפותח: משתיקים לגמרי
  closeImageCardPopup(); // RecallPopup-style contract: goTo() closes global popups explicitly
  /* מסך 4 (SCQ) — סוגר את פופאפ-המשוב/הרמז בכל ניווט, לפי 720-templates
     → _global-components.md → Feedback popup system → "Popups are
     contextual to the current screen only". */
  document.getElementById('s3q-popup')?.classList.add('hidden');
  document.getElementById('s3q-hint-overlay')?.classList.add('hidden');
  s2tClosePopups(); // מסך 3: כנ"ל
  s8qClosePopups(); // מסך 9: הפופאפים contextual למסך (נסגרים בכל ניווט)
  s15qClosePopups(); // מסך 16: כנ"ל + בועת ההסבר
  s19ClosePopups(); // מסך 20: כנ"ל
  s26ClosePopups(); // מסך 27: כנ"ל
  s27qClosePopups(); // מסך 28: כנ"ל
  window.__methodicaImageZoomPopupModule?.closePopup(); // פופאפ הגדלת-תמונה נסגר בכל ניווט
  if (currentScreen === 21 && n !== 21) document.getElementById('s21-char-video').pause();
  if (currentScreen === 22 && n !== 22) document.getElementById('s22-char-video').pause();
  if (currentScreen === 24 && n !== 24) document.getElementById('s24-char-video').pause();
  if (currentScreen === 25 && n !== 25) document.getElementById('s25-char-video').pause();
  if (currentScreen === 21 && n !== 21) frcGhStop('s21', false);
  if (currentScreen === 23 && n !== 23) frcGhStop('s23', false);
  if (currentScreen === 19 && n !== 19) dndGhStop('s19', false);
  if (currentScreen === 26 && n !== 26) dndGhStop('s26', false);
  if (currentScreen === 5 && n !== 5) s5Leave();
  if (currentScreen === 6 && n !== 6) leaveHl('s6');
  if (currentScreen === 7 && n !== 7) leaveHl('s7');
  if (currentScreen === 10 && n !== 10) leaveAx('s10');
  if (currentScreen === 11 && n !== 11) leaveAx('s11');
  if (currentScreen === 13 && n !== 13) s13Leave();
  if (currentScreen === 14 && n !== 14) s14Leave();
  if (currentScreen === 17 && n !== 17) s17Leave();
  if (currentScreen === 18 && n !== 18) s18Leave();
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
  if (n === 0) { const sv = document.getElementById('s0-video'); if (sv) sv.play().catch(function () {}); }
  if (window.Motion) Motion.reveal(target);
  if (n === 5) startScreen5();
  if (n === 2) s2GhStart(); // אחרי שהמסך גלוי — רק אז הגיאומטריה של הכרטיסיות נמדדת נכון
  if (n === 21) frcGhStart('s21');
  if (n === 23) frcGhStart('s23');
  if (n === 19) dndGhStart('s19');
  if (n === 26) dndGhStart('s26');
  if (n === 6) startScreenHl('s6');
  if (n === 7) startScreenHl('s7');
  if (n === 10) startScreenAx('s10');
  if (n === 11) startScreenAx('s11');
  if (n === 13) startScreen13();
  if (n === 14) startScreen14();
  if (n === 17) startScreen17();
  if (n === 18) startScreen18();
  if (n === 22) playS22Video(); // אחרי שהמסך נהיה גלוי
  if (n === 24) playS24Video();
  /* "Reopening feedback on return to a resolved screen" (_global-
     components.md) — עכשיו בר-הפעלה בפועל: מסך 5 (s4) קיים, אז חזרה
     (Back) ממנו למסך 4 (s3) פתור מפעילה את זה. נבדק ב-Playwright (ראו
     ARCHITECTURE.md → "מסך 5" → "נבדק בפועל"). */
  if (viaBack && n === 2 && s2TableDone) s2tReopenPopup();
  if (viaBack && n === 3 && s3qDone) s3qReopenPopup();
  if (viaBack && n === 8 && s8qDone) s8qReopenPopup();
  if (viaBack && n === 15 && s15qDone) s15qReopenPopup();
  if (viaBack && n === 19 && s19Done) s19ReopenPopup();
  if (viaBack && n === 26 && s26Done) s26ReopenPopup();
  if (viaBack && n === 27 && s27qDone) s27qReopenPopup();
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
  if (n === 6) resetScreenStateHl('s6');
  if (n === 7) resetScreenStateHl('s7');
  if (n === 8) resetScreenState8();
  if (n === 12) resetScreenState12();
  if (n === 16) resetScreenState16();
  if (n === 17) resetScreenState17();
  if (n === 18) resetScreenState18();
  if (n === 19) resetScreenState19();
  if (n === 20) resetScreenState20();
  if (n === 21) s21Sync(false);
  if (n === 23) s23Sync();
  if (n === 22) resetScreenState22();
  if (n === 24) playS24Video();
  if (n === 25) playS25Video();
  if (n === 26) resetScreenState26();
  if (n === 10) resetScreenStateAx('s10');
  if (n === 11) resetScreenStateAx('s11');
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

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'ArrowLeft') advanceScreen();
  if (e.ctrlKey && e.key === 'ArrowRight') backScreen();
  if (e.key === 'Escape') {
    closeImageCardPopup();
    s3qCloseHint();
    s8qCloseHint();
    s15qCloseHint();
    s15CloseTip();
    s19CloseHint();
    s26CloseHint();
    s27qCloseHint();
  }
});

/* ---------- ניווט גנרי — הגייט (advance gate) חי כאן, לא רק ב-onclick
   של הכפתור, וגם מקלדת (Ctrl+←) עוברת דרכו (720-templates →
   _global-components.md → "Advance gates") ---------- */
function advanceScreen() {
  /* גייט מסך 3 (FlipCards+טבלה) ומסך 4 (SCQ) חיים כאן, לא רק ב-onclick
     של הכפתור (720-templates → _global-components.md → "Advance
     gates") — כך שגם Ctrl+← עוצר. גייט מסך 4 בודק resolved (s3qDone),
     לא correctness — נכון או שגוי-סופי שניהם פותחים את ההמשך (ראו
     _question-template-defaults.md → "Attempt model"). */
  if (currentScreen === 2 && !frcAllRevealed()) return;
  if (currentScreen === 3 && !s3qDone) return;
  if (currentScreen === 23 && !s23Revealed.every(Boolean)) return; // מסך 24: ההמשך נדלק אחרי שהופכו שלוש הכרטיסיות
  if (currentScreen === 21 && !s21AllRevealed()) return; // מסך 22: ההמשך נדלק אחרי שהופכו שתי הכרטיסיות
  if (currentScreen === 20 && !s20Attempted) return; // מסך 21: ההמשך נדלק אחרי ניסיון אחד ביישומון
  if (currentScreen === 27 && !s27qDone) return; // מסך 28: ההמשך נפתח רק אחרי שהשאלה נפתרה
  if (currentScreen === 26 && !s26Done) return; // מסך 27: ההמשך נפתח רק אחרי שהשאלה נפתרה
  if (currentScreen === 11 && !axState.s11.done) return; // מסך 12: ההמשך נפתח רק אחרי שהצירים והבועיות נבנו
  if (currentScreen === 13 && s13State.marked < S13_N) return; // מסך 14: ההמשך נפתח אחרי העברת כל הנקודות
  if (currentScreen === 19 && !s19Done) return; // מסך 20: ההמשך נפתח רק אחרי שהשאלה נפתרה
  if (currentScreen === 18 && !s18Done) return; // מסך 19: ההמשך נדלק בסוף חשיפת האלמנטים
  if (currentScreen === 17 && !s17Done) return; // מסך 18: ההמשך נדלק בסוף חשיפת האלמנטים
  if (currentScreen === 16 && !s16Attempted) return; // מסך 17: ההמשך נדלק אחרי ניסיון אחד ביישומון
  if (currentScreen === TOTAL_SCREENS - 1) { partFinish(); return; } // המסך האחרון בסיין → המסך הראשון בסיין הבא
  goTo(currentScreen + 1);
}
function backScreen() {
  goTo(currentScreen - 1, true);
}

/* =========================================================
   מסך 1 — FullImageWithTextOverlay
   Figma node 1038:19205. Re-entry הוא stateless (אין תשובה/ניסיון
   לשחזר) — לפי 720-templates → FullImageWithTextOverlay.md §D.
   ========================================================= */
function resetScreenState0() {
  // no-op מתועד: אין state לסנכרן (re-entry הוא stateless, לפי
  // FullImageWithTextOverlay.md §D — אין תשובה/ניסיון לשחזר).
}

/* =========================================================
   מסך 2 — כרטיסיות תמונה (Image Cards → Popups)
   Figma node 4504:21693. אין gate על ההמשך (לא נמצאה עדות ל"יש
   לצפות בשני הפופאפים לפני שממשיכים" — לא בתסריט ולא ב-Figma;
   זה גם לא flip-cards, אז חוזה ה-unlock-on-all-revealed של
   FlipCardsReveal.md לא חל כאן). אם המפיקה תבקש gate כזה בהמשך,
   יש להוסיף אותו כאן וב-advanceScreen(). ---------- */
function resetScreenState1() {
  // no-op מתועד: אין state לסנכרן (הכרטיסיות אינן נשארות "פתוחות";
  // הפופאפ, כשייבנה, ינוהל בנפרד מ-state המסך עצמו).
}

/* =========================================================
   פופאפ משותף — כרטיסיות מסך 2 (ContentPopup)
   Figma: node 171:3370 (ContentPopup), node 249:5261 (General Popup
   Close Btn). תוכן: תסריט ההפקה, שקפים 5/6 — חולץ מה-XML הגולמי
   (לא רק מ-python-pptx ברמת ה-paragraph) כדי לתפוס גם שבירות-שורה
   מפורשות (`<a:br>`) בתוך פסקה, לא רק גבולות `<a:p>`. כל ערך במערך
   מייצג `<a:p>` אחד; `<br>` בתוך מחרוזת מייצג `<a:br>` מפורש בתוך
   אותה פסקה (pptx-script-extraction → "Authored line breaks are not
   the same as rendered wrapping"). <strong> משמר bold מקורי; הצבע
   הכחול (`--subject-heading`) הוא עיצוב מכוון לפי הנחיית מפיקה
   ("תעשה כותרות בכחול כמו בפיגמה") — לא צבע-run מקורי מה-PPTX (שם
   color=None בכל ה-runs המודגשים; הכחול הוא מוסכמת-הצבע של ContentPopup
   ב-Figma לטקסט bold/heading, לא עדות-PPTX). ראו ARCHITECTURE.md. ==== */
const IMAGE_CARD_POPUPS = {
  'density-jordan': [
    'غرقت الحقيبة والمفاتيح في الماء، لكن القبعة طفت.',
    '<strong>لماذا يحدث هذا؟</strong>',
    'لكل مادة خاصيّة تميزها وحدها، تُقاس بكمية الكتلة الموجودة داخل كل وحدة حجم.<br>تُسمى هذه الخاصيّة <strong>الكثافة.</strong>',
    'ستحدد قيمة الكثافة لكل مادة ما إذا كانت ستغرق أو تطفو، سنتعلم عن ذلك لاحقًا.'
  ],
  'density-crown': [
    '<strong>هل تتذكرون أرخميدس وتاج الملك؟</strong><br>قِسنا حجم التاج، لكن بقي سؤالًا واحدًا مفتوحًا:',
    'كيف عرف أرخميدس أن التاج ليس مصنوعًا من ذهب خالص؟',
    '<strong>خاصيّة الكثافة</strong> يمكن أن تفسر ذلك.'
  ]
};

const IMAGE_CARD_THUMBS = {
  'density-jordan': { src: 'assets/images/yarden-river.png', alt: 'نهر الأردن' },
  'density-crown': { src: 'assets/images/man-holds-crown.png', alt: 'رجل يحمل تاجًا ذهبيًا' }
};

function openImageCardPopup(popupId) {
  const paragraphs = IMAGE_CARD_POPUPS[popupId];
  if (!paragraphs) return;
  var thumb = IMAGE_CARD_THUMBS[popupId];
  var ps = paragraphs.map(function (html) { return '<p>' + html + '</p>'; });
  /* תמונה מוקטנת ליד הפסקה הראשונה — Figma 2733:20627 (תיבה 148×142 מימין לכותרת) */
  var head = thumb
    ? '<div class="content-popup-head"><figure class="content-popup-fig"><img class="content-popup-thumb" src="' + thumb.src +
      '" alt="' + thumb.alt + '"></figure>' + ps.shift() + '</div>'
    : '';
  document.getElementById('img-card-popup-body').innerHTML = head + ps.join('');
  document.getElementById('img-card-popup-backdrop').classList.remove('hidden');
  /* flag-btn מקבל את מצג "Pop-up" (Figma: ReportProblem state="Pop-up")
     — לא נעלם מאחורי ה-backdrop (ראו z-index ב-styles.css). */
  document.querySelector('.flag-btn')?.classList.add('flag-btn--popup');
}
function closeImageCardPopup() {
  document.getElementById('img-card-popup-backdrop')?.classList.add('hidden');
  document.querySelector('.flag-btn')?.classList.remove('flag-btn--popup');
}
function closeImageCardPopupOnBackdrop(e) {
  if (e.target === e.currentTarget) closeImageCardPopup();
}

/* =========================================================
   מסך 3 — קוביות ברזל מתהפכות (FlipCardsReveal, דו-כיווני) + טבלת
   מסה/נפח. Figma node 4504:21687. תבנית: 720-templates →
   FlipCardsReveal.md — חוזה ה-unlock (frcRevealed, seen-at-least-once,
   בלתי-תלוי במצב-ההפיכה-הנוכחי) חל כאן, מותאם לגרסה הדו-כיוונית לפי
   הנחיית מפיקה מפורשת ("תאפשר גם הפיכה בחזרה בלחיצה נוספת") — ראו
   index.html לפירוט המלא. נתוני הקוביות בפועל הם data-attributes על
   כל כפתור (`data-cube`/`data-mass`/`data-volume`) — מקור-אמת יחיד,
   לא מוכפל למערך JS נפרד. ========================================= */
let frcRevealed = { a: false, b: false, c: false, d: false }; // seen-at-least-once — unlock, ONE-WAY (per §"Canonical unlock rule")
let frcFlipped = { a: false, b: false, c: false, d: false };  // מצב-הפיכה ויזואלי נוכחי — דו-כיווני, נפרד מ-frcRevealed (FlipCardsReveal.md → "Flip-back behavior")

function frcAllRevealed() {
  return Object.values(frcRevealed).every(Boolean);
}

function frcFlip(cardEl) {
  const cube = cardEl.dataset.cube;
  const willBeFlipped = !cardEl.classList.contains('is-flipped');
  frcFlipped[cube] = willBeFlipped;
  cardEl.classList.toggle('is-flipped', willBeFlipped);
  cardEl.setAttribute('aria-expanded', willBeFlipped ? 'true' : 'false');

  /* עצירת מחוות-היד — "any equivalent element counts as gesture found"
     (720-templates → _gesture-hints.md) — לחיצה על **כל** כרטיסייה
     (לא רק זו שנשאה את המחווה) עוצרת אותה לצמיתות למסך הזה. */
  s2GhStop(true);

  /* seen-at-least-once — מסמן שהקובייה "פתוחה" (מותר ללומד להזין את
     ערכיה בטבלה, ראו s2TableAllFilled). אין יותר מילוי-טבלה אוטומטי —
     סטייה מכוונת ומבוקשת במפורש מהערת-המפיק המקורית (ראו
     ARCHITECTURE.md): הלומד מזין בעצמו את מה שהוא רואה על גב הקלף. */
  if (!frcRevealed[cube]) frcRevealed[cube] = true;

  s2UpdateContinueBtn();
}

/* ---------- מחוות-יד (Cursor Click) ----------
   720-templates → _gesture-hints.md: JS-owned lifecycle + invalidation
   token, עוגן מהגיאומטריה האמיתית של הכרטיס (לא ניחוש), persistent/
   restartable עד שהלומד מבצע את הפעולה בעצמו (ואז נעצר לצמיתות
   למסך הזה — "gesture understood" הוא state עצמאי, לא תלוי reset אחר). */
let s2GhToken = 0;
let s2GhUnderstood = false;

function s2GhStart() {
  if (s2GhUnderstood) return; // הלומד כבר גילה את המחווה — לא חוזרת יותר במסך הזה
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const gh = document.getElementById('s2-gh');
  const grid = document.getElementById('s2-cards-grid');
  const firstUnrevealed = grid && grid.querySelector('.frc-card:not(.is-flipped)');
  if (!gh || !firstUnrevealed) return;
  s2GhToken++;
  const gridRect = grid.getBoundingClientRect();
  const cardRect = firstUnrevealed.getBoundingClientRect();
  const scale = gridRect.width ? (grid.offsetWidth / gridRect.width) : 1; // מתקן ל-scaleApp() (transform:scale על #app)
  /* עוגן: הפינה הימנית-העליונה של הכרטיסייה (בהזחה קטנה פנימה, כדי שהטבעות יישארו על הכרטיס) */
  const inset = 20;
  const centerX = (cardRect.right - gridRect.left) * scale - inset;
  const centerY = (cardRect.top - gridRect.top) * scale + inset;
  gh.style.left = (centerX - gh.offsetWidth / 2) + 'px';
  gh.style.top = (centerY - gh.offsetHeight / 2) + 'px';
  gh.classList.remove('hidden');
}
function s2GhStop(understood) {
  s2GhToken++;
  if (understood) s2GhUnderstood = true;
  document.getElementById('s2-gh')?.classList.add('hidden');
}

/* =========================================================
   מסך 3 — טבלת-אינפוטים (מסה/נפח/תוצאה לכל קובייה)
   הלומד מזין בעצמו את הערכים לפי מה שראה בגב הקלף ההפוך (לא מילוי
   אוטומטי — ראו הערה ב-frcFlip למעלה). "בדיקה"/"המשך" הוא אותו כפתור
   אחד שמתחלף (לא שני כפתורים) — התנהגות וסימון-שדות (ירוק/אדום, נעילה
   אחרי בדיקה סופית) לקוחים במפורש מרפרנס המפיקה:
   methodica-science-mass-measure-02-04 (מסך 2, `tblCheck`/`tblMarkAll`/
   `tblLockAll`/`.tbl-input-correct`/`.tbl-input-wrong`) — ראו
   ARCHITECTURE.md. מקור-האמת למסה/נפח הנכונים הוא ה-data-attributes של
   כרטיסי-ההיפוך עצמם (לא מוכפל למערך נפרד). ========================= */
const S2_TABLE_ROWS = ['a', 'b', 'c', 'd'];
const S2_TABLE_FIELD_KEYS = ['mass', 'vol', 'result'];
let s2TableAttempts = 0;
let s2TableDone = false;
let s2TableLastSignature = null; /* retry gate — חתימת-הניסיון האחרון שנבדק ונמצא שגוי */

function s2TableFieldEl(cube, key) {
  return document.getElementById('s2-input-' + cube + '-' + key);
}

/* ערכים נכונים — מחושבים מ-data-mass/data-volume של כרטיס-ההיפוך עצמו,
   לא ממוספרים-קבועים כפולים כאן. */
function s2TableCorrectValues(cube) {
  const card = document.querySelector('.frc-card[data-cube="' + cube + '"]');
  const mass = parseFloat(card.dataset.mass);
  const vol = parseFloat(card.dataset.volume);
  const result = Math.round((mass / vol) * 100) / 100; // מגן מפני שרידי float, לא עיגול תוכני
  return { mass: mass, vol: vol, result: result };
}

function s2TableNormalize(raw) {
  return raw.trim().replace(',', '.');
}

function s2TableAllFilled() {
  return S2_TABLE_ROWS.every(function (cube) {
    return S2_TABLE_FIELD_KEYS.every(function (key) {
      const el = s2TableFieldEl(cube, key);
      return el && el.value.trim() !== '';
    });
  });
}

function s2TableSignature() {
  const parts = [];
  S2_TABLE_ROWS.forEach(function (cube) {
    S2_TABLE_FIELD_KEYS.forEach(function (key) {
      const el = s2TableFieldEl(cube, key);
      parts.push(el ? s2TableNormalize(el.value) : '');
    });
  });
  return parts.join('|');
}

function s2TableAllCorrect() {
  return S2_TABLE_ROWS.every(function (cube) {
    const correct = s2TableCorrectValues(cube);
    return S2_TABLE_FIELD_KEYS.every(function (key) {
      const el = s2TableFieldEl(cube, key);
      return el && Number(s2TableNormalize(el.value)) === correct[key];
    });
  });
}

/* סימון per-field (כל שדה מקבל ✓/✗ משלו, לפי הרפרנס המפורש — לא סימן
   מאוחד אחד לשבר, כמו שברירת-המחדל הגנרית של ValueInputQuestion
   Variant B הייתה מציעה; זו סטייה מתועדת ומכוונת). */
function s2TableMarkAll() {
  S2_TABLE_ROWS.forEach(function (cube) {
    const correct = s2TableCorrectValues(cube);
    S2_TABLE_FIELD_KEYS.forEach(function (key) {
      const el = s2TableFieldEl(cube, key);
      if (!el) return;
      el.classList.remove('s2-input-correct', 's2-input-wrong');
      const ok = Number(s2TableNormalize(el.value)) === correct[key];
      el.classList.add(ok ? 's2-input-correct' : 's2-input-wrong');
    });
  });
}

function s2TableLockAll(revealCorrect) {
  S2_TABLE_ROWS.forEach(function (cube) {
    const correct = s2TableCorrectValues(cube);
    S2_TABLE_FIELD_KEYS.forEach(function (key) {
      const el = s2TableFieldEl(cube, key);
      if (!el) return;
      el.disabled = true;
      if (revealCorrect) {
        el.value = String(correct[key]);
        el.classList.remove('s2-input-wrong');
        el.classList.add('s2-input-revealed');
      }
    });
  });
}

/* מגייס את כפתור "בדיקה"/"המשך" גם לפי מצב-ההיפוך (frcAllRevealed) וגם
   לפי מצב-הטבלה (s2TableDone/retry gate) — נקרא מ-frcFlip,
   מ-s2OnTableInput, מ-s2CheckTable ומ-resetScreenState2. */
function s2UpdateContinueBtn() {
  const btn = document.getElementById('s2-continue');
  if (!btn) return;
  if (s2TableDone) { btn.disabled = false; return; }
  if (s2TableAttempts > 0 && s2TableSignature() === s2TableLastSignature) {
    btn.disabled = true; /* retry gate — אותה תשובה שגויה שוב, ראו _question-template-defaults.md */
    return;
  }
  btn.disabled = !(frcAllRevealed() && s2TableAllFilled());
}

/* התוצאה (תיבת הטקסט שמימין ל-"=") מחושבת אוטומטית מערכי השבר שהלומד הזין (מסה ÷ נפח) — לא דורשת חישוב.
   ריקה כשאחד הערכים חסר / לא מספר / הנפח 0. מעוגלת ל-2 ספרות כמו ערכי הצפיפות הנכונים. */
function s2TableAutoResult(cube) {
  const out = s2TableFieldEl(cube, 'result');
  if (!out || out.disabled) return;
  const m = s2TableNormalize(s2TableFieldEl(cube, 'mass').value);
  const v = s2TableNormalize(s2TableFieldEl(cube, 'vol').value);
  const mass = Number(m), vol = Number(v);
  out.value = (m !== '' && v !== '' && isFinite(mass) && isFinite(vol) && vol !== 0)
    ? String(Math.round((mass / vol) * 100) / 100) : '';
}
function s2OnTableInput() {
  S2_TABLE_ROWS.forEach(s2TableAutoResult);
  s2UpdateContinueBtn();
}

/* ניסיון מענה אחד בלבד (בקשת מפיקה): אחרי הבדיקה הטבלה ננעלת תמיד — נכון: משוב הצלחה; שגוי: הנתונים הנכונים
   מוצגים מיד + טוגל "מעבר לתשובה שלי" / "מעבר לתשובה נכונה" (View My Answer Toggle). */
const S2T_MAX_ATTEMPTS = 1;
let s2TableAnswer = null;     // צילום תשובת הלומד (cube-key → ערך גולמי) בשגוי
let s2TableView = 'solution'; // 'solution' | 'answer' — runtime בלבד
let s2TableOutcome = null;    // 'correct' | 'wrong'
let s2TablePartial = false;   // חלק מהשדות נכון (לא כולם) → "התשובה נכונה חלקית."

function s2TableFieldRight(cube, key) {
  const el = s2TableFieldEl(cube, key);
  return !!el && Number(s2TableNormalize(el.value)) === s2TableCorrectValues(cube)[key];
}
function s2TableCountRight() {
  let n = 0;
  S2_TABLE_ROWS.forEach(function (cube) { S2_TABLE_FIELD_KEYS.forEach(function (key) { if (s2TableFieldRight(cube, key)) n++; }); });
  return n;
}

function s2CheckTable() {
  if (s2TableDone || !(frcAllRevealed() && s2TableAllFilled())) return;
  s2TableAttempts++;
  s2TableLastSignature = s2TableSignature();
  /* xAPI: performance — the 12 table values in the catalogue's steps order (mass, volume, ratio × cube a–d); one attempt. */
  xapiAnswered('002', 'q1', s2TableAllCorrect(), true, { steps: S2_TABLE_ROWS.reduce(function (acc, cube) { return acc.concat(S2_TABLE_FIELD_KEYS.map(function (key) { return s2TableNormalize(s2TableFieldEl(cube, key).value); })); }, []) });
  const btn = document.getElementById('s2-continue');
  if (s2TableAllCorrect()) {
    s2TableDone = true;
    s2TableOutcome = 'correct';
    s2TableMarkAll();
    s2TableLockAll(false);
    s2tShowPopup('correct');
  } else {
    s2TablePartial = s2TableCountRight() > 0;
    s2TableDone = true;
    s2TableOutcome = 'wrong';
    s2TableAnswer = {};
    S2_TABLE_ROWS.forEach(function (cube) {
      S2_TABLE_FIELD_KEYS.forEach(function (key) { s2TableAnswer[cube + '-' + key] = s2TableFieldEl(cube, key).value; });
    });
    s2TableView = 'solution';
    s2TableApplyView();
  }
  if (btn) btn.textContent = 'متابعة';
  s2UpdateContinueBtn();
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

/* הבעלים היחיד של מצב "שגוי": הנתונים הנכונים / התשובה שלי */
function s2TableApplyView() {
  if (s2TableAnswer === null) return;
  S2_TABLE_ROWS.forEach(function (cube) {
    const correct = s2TableCorrectValues(cube);
    S2_TABLE_FIELD_KEYS.forEach(function (key) {
      const el = s2TableFieldEl(cube, key);
      el.disabled = true;
      el.classList.remove('s2-input-correct', 's2-input-wrong', 's2-input-revealed');
      if (s2TableView === 'answer') {
        el.value = s2TableAnswer[cube + '-' + key];
        el.classList.add(Number(s2TableNormalize(el.value)) === correct[key] ? 's2-input-correct' : 's2-input-wrong');
      } else {
        el.value = String(correct[key]);
        el.classList.add('s2-input-revealed');
      }
    });
  });
  s2tShowPopup('wrong', s2TableView);
}
function s2TableToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done
  if (s2TableAnswer === null) return;
  s2TableView = (s2TableView === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s2TableApplyView();
}

const S2T_FEEDBACK = {
  correct: { bg: '#f2ffe8', title: 'لقد أكملتم الجدول بشكل صحيح. أحسنتم!' },
  wrong:   { bg: '#ffdbdc', title: 'الإجابة ليست صحيحة بالكامل.<br>تظهر البيانات الصحيحة الآن.',
             action: { label: 'الانتقال إلى إجابتي' }, answerView: { action: { label: 'الانتقال إلى الإجابة الصحيحة' } } }
};
function s2tShowPopup(type, view) {
  const cfg = S2T_FEEDBACK[type];
  const popup = document.getElementById('s2tq-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, action = cfg.action || null;
  /* כלל קבוע לשאלות מרובות-חלקים: נכון על חלק מהשדות (לא כולם) → "התשובה נכונה חלקית." */
  if (type === 'wrong' && s2TablePartial) title = title.replace('الإجابة ليست صحيحة بالكامل.', 'الإجابة صحيحة جزئيًا.');
  if (type === 'wrong' && view === 'answer') {
    action = cfg.answerView.action;
    title = title.split('<br>')[0]; // בתצוגת תשובת הלומד הנתונים הנכונים לא מוצגים
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s2tq-popup-title').innerHTML = title;
  const box = document.getElementById('s2tq-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s2TableToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}
function s2tReopenPopup() {
  if (s2TableOutcome === 'wrong') { s2TableView = 'solution'; s2TableApplyView(); }
  else if (s2TableOutcome) s2tShowPopup(s2TableOutcome);
}
function s2tClosePopups() { document.getElementById('s2tq-popup')?.classList.add('hidden'); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s2tPopupDrag = null;
function s2tPopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s2tq-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s2tPopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s2tPopupMove, { passive: false });
  document.addEventListener('pointerup', s2tPopupUp);
  document.addEventListener('pointercancel', s2tPopupUp);
  e.preventDefault();
}
function s2tPopupMove(e) {
  if (!s2tPopupDrag || e.pointerId !== s2tPopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s2tPopupUp(e); return; }
  const popup = document.getElementById('s2tq-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s2tPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s2tPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s2tPopupUp(e) {
  if (s2tPopupDrag && e && e.pointerId !== undefined && e.pointerId !== s2tPopupDrag.id) return;
  s2tPopupDrag = null;
  document.removeEventListener('pointermove', s2tPopupMove);
  document.removeEventListener('pointerup', s2tPopupUp);
  document.removeEventListener('pointercancel', s2tPopupUp);
}

function s2ContinueClick() {
  if (s2TableDone) { advanceScreen(); return; }
  s2CheckTable();
}

/* =========================================================
   מסך 3 — resetScreenState2()
   מסנכרן תמיד את ה-UI מה-state (לא "פעם אחת בלבד") — כניסה חוזרת
   למסך משקפת נכון אילו קוביות כבר התגלו ומצב ה-Continue, לפי חוזה
   ה-revisit הקנוני (FlipCardsReveal.md → States → "Return"). ========= */
function resetScreenState2() {
  document.querySelectorAll('#s2 .frc-card').forEach(function (cardEl) {
    const cube = cardEl.dataset.cube;
    cardEl.classList.toggle('is-flipped', frcFlipped[cube]);
    cardEl.setAttribute('aria-expanded', frcFlipped[cube] ? 'true' : 'false');
  });
  s2tClosePopups();
  if (s2TableDone) { // מסך פתור חוזר נעול: שגוי — בתצוגת הנתונים הנכונים
    if (s2TableOutcome === 'wrong') { s2TableView = 'solution'; s2TableApplyView(); s2tClosePopups(); }
    const btn = document.getElementById('s2-continue');
    if (btn) btn.textContent = 'متابعة';
  }
  s2UpdateContinueBtn();
  s2GhStart();
}

/* =========================================================
   מסך 4 — שאלת בחירה יחידה (SingleChoiceQuestion) + טבלה פתורה
   אין node חדש בפיגמה (הנחיית מפיקה מפורשת — ראו index.html). תבנית:
   720-templates → SingleChoiceQuestion.md + _question-template-
   defaults.md. תסריט: שקף 9 (pptx-script-extraction — ראו
   ARCHITECTURE.md → "מסך 4" לפירוט המלא של החילוץ/ההחלטות).

   correctId='b' — "היחס בין המסה לנפח נשאר קבוע בכל הקוביות." תואם
   מילה-במילה למשוב-הנכון בשקף 9 ("...היחס ביניהם נשאר קבוע.").
   maxAttempts=2 — ברירת המחדל הקנונית (_question-template-defaults.md
   → "Attempt model"); התסריט לא מציין סטייה מאושרת. הרמז זמין מההתחלה
   (לא hidden-until-first-wrong): כפתור "אפשר רמז?" מופיע כבר על-גבי
   מצג-ברירת-המחדל של שקף 9. אין View My Answer Toggle — Single
   ChoiceQuestion מוחרג במפורש (_global-components.md → "Applicability
   rule": נבחר+נכון גלויים בו-זמנית ממילא). ========================= */
const S3Q = { correctId: 'b', maxAttempts: 2 };
let s3qSelected = null;
let s3qAttempts = 0;
let s3qDone = false;
let s3qLastWrong = null;   // retry gate — _question-template-defaults.md → "Retry gate"
let s3qLastOutcome = null; // 'correct' | 'wrong2' — לשחזור-הפופאפ בחזרה (Back) למסך פתור

/* משוב (שקף 9, שלוש תיבות-מלבן מזוהות לפי xfrm — ראו ARCHITECTURE.md):
   correct/wrong2 חולקים גוף-הסבר משותף (_question-template-defaults.md
   → "Feedback: shared explanation" — ברירת מחדל כשהמפיק לא סיפק גוף
   נפרד לכל תוצאה, כפי שקורה כאן). wrong2.title מקבל את השורה השנייה
   הקנונית הקבועה ("התשובה הנכונה מוצגת.") בנוסף לכותרת המקורית מהתסריט
   (_global-components.md → "Terminal-incorrect title carries a fixed
   second line"). retry (ניסיון-ראשון-שגוי) — כותרת קצרה בלבד, ללא גוף,
   בדיוק כפי שמופיע בשקף 9 ("קראו את הרמז ונסו שוב"). */
const S3Q_POPUP_CFG = {
  retry: {
    bg: '#ffdbdc',
    title: 'اقرأوا التلميح وحاولوا مرة أخرى',
    body: []
  },
  correct: {
    bg: '#edf8ed',
    title: 'ممتاز!',
    body: ['على الرغم من أن الكتلة والحجم مختلفان بالنسبة للمكعبات، <strong>النسبة</strong> بينهما تبقى <strong>ثابتة</strong>.']
  },
  wrong2: {
    bg: '#ffdbdc',
    title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.',
    body: ['على الرغم من أن الكتلة والحجم مختلفان بالنسبة للمكعبات، <strong>النسبة</strong> بينهما تبقى <strong>ثابتة</strong>.']
  }
};

function s3qOptEl(id) {
  return document.querySelector('#s3 .s3q-opt[data-id="' + id + '"]');
}

function s3qSelect(id) {
  if (s3qDone) return;
  /* First-attempt retry feedback dismissal (720-templates →
     _global-components.md → "Feedback popup system"): מתחיל-לתקן
     (בוחר-מחדש) מסלק את פופאפ ה-retry באותה אינטראקציה — לא רק ב-אחרי
     ניסיון-שני, כי הפונקציה כבר חוזרת למעלה אם s3qDone (=נכון/שגוי-
     סופי, שאסור להם להיסגר ככה). מנקה גם 'wrong' מכל האפשרויות —
     סימון-שגוי מניסיון קודם לא אמור להישאר גלוי כשמתחילים ניסיון חדש. */
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
  if (checkBtn) {
    /* Retry gate (_question-template-defaults.md → "Retry gate"): אחרי
       ניסיון-ראשון-שגוי, "צדקתי?" נשאר disabled עד שנבחרה תשובה השונה
       מזו שסומנה שגויה — לא מתאפס אוטומטית בכל בחירה. */
    checkBtn.disabled = (s3qLastWrong !== null && id === s3qLastWrong);
  }
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
  popup.style.left = '2px';
  popup.style.top = 'auto';
  popup.style.bottom = '76px';
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
  if (s3qDone) { advanceScreen(); return; } /* הכפתור עצמו הופך לפעולת-ההמשך אחרי פתרון, per _global-components.md → "Completion state and primary button" */
  if (!s3qSelected) return;
  s3qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('002', 'q2', s3qSelected === S3Q.correctId, s3qSelected === S3Q.correctId || s3qAttempts >= S3Q.maxAttempts, { choices: [xapiOptIdx(s3qSelected)] });

  document.getElementById('s3q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  if (s3qSelected === S3Q.correctId) {
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('correct');
    s3qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }

  if (s3qAttempts < S3Q.maxAttempts) {
    /* ניסיון ראשון שגוי — retry, הפתרון לא נחשף (SingleChoiceQuestion.md
       → States → "4. Try Again"). */
    s3qMark(s3qSelected, 'wrong');
    s3qLastWrong = s3qSelected;
    s3qShowPopup('retry');
    const checkBtn = document.getElementById('s3q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate — נשאר נעול עד בחירה שונה */
  } else {
    /* ניסיון סופי שגוי — חושף את הנכונה, נועל (SingleChoiceQuestion.md
       → States → "6. Incorrect, final attempt"). */
    s3qMark(s3qSelected, 'wrong');
    s3qMark(S3Q.correctId, 'correct');
    s3qShowPopup('wrong2');
    s3qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s3qLockOptions() {
  document.querySelectorAll('#s3 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
}

function s3qFinish(outcome) {
  s3qDone = true;
  s3qLastOutcome = outcome;
  s3qLockOptions();
  const checkBtn = document.getElementById('s3q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    /* תווית-ההמשך: אין תווית מאושרת בתסריט → נופל לברירת-המחדל הקנונית
       הספציפית ל-SingleChoiceQuestion ("שנמשיך?"), לא ל"המשך" הגנרי של
       שאר מסכי הפרויקט הזה — כל תבנית עם ה-fallback שלה
       (_global-components.md → "Completion state and primary button"). */
    checkBtn.textContent = 'متابعة';
  }
  const hintBtn = document.getElementById('s3q-hint');
  if (hintBtn) hintBtn.classList.add('s3q-hint-done'); /* אין עוד צורך ברמז אחרי פתרון */
  s3qCloseHint();
}

/* ---------- רמז — זמין מההתחלה (לא hidden-until-first-wrong): כפתור
   "אפשר רמז?" מופיע כבר על-גבי מצג-ברירת-המחדל של שקף 9 (לא ב-state
   נפרד "אחרי ניסיון שגוי"). גוף-רמז בלבד בתסריט (ללא כותרת מפורשת) →
   כותרת גנרית קנונית "רמז" (_question-template-defaults.md → Hint
   policy → "Title and body"). ניתן לפתוח שוב ושוב עד שהשאלה נפתרת
   (לא disable-אחרי-פתיחה-ראשונה — נבדק מול רפרנס-ייצור עדכני,
   methodica-science-mass-liquid-01-02, ראו ARCHITECTURE.md). ---------- */
function s3qOpenHint() {
  if (s3qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('002', 'q2');
  document.getElementById('s3q-hint-overlay')?.classList.remove('hidden');
}
function s3qCloseHint() {
  document.getElementById('s3q-hint-overlay')?.classList.add('hidden');
}
function s3qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s3qCloseHint();
}

/* ---------- פופאפ-משוב — גרירה חופשית, נעצרת בגבולות הקנבס ומעל
   פס-הניווט (720-templates → _global-components.md → "Drag bounds").
   מיושם עצמאית (הפרויקט הזה עדיין לא מחזיק רכיב-גרירה גלובלי משותף)
   — ראו gestures/frc-card לתבנית-קורדינטות/scale דומה שכבר קיימת כאן
   (s2GhStart). ---------- */
let s3qPopupDrag = null;
function s3qPopupMouseDown(e) {
  const popup = document.getElementById('s3q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const topPx = parseFloat(popup.style.top);
  const top = isNaN(topPx) ? popup.offsetTop : topPx;
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s3qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - (parseFloat(popup.style.left) || 2),
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

/* =========================================================
   מסך 4 — resetScreenState3()
   resume-state lock: ה-DOM עצמו (disabled/.correct/.wrong/.selected,
   תווית-הכפתור) לעולם לא נהרס בין מסכים (`.screen` רק מתחלף
   display:none/block) — אז "שחזור מצב-ביניים" הוא ממילא no-op; אין
   לבנות מחדש/לאפס דבר בכניסה חוזרת למסך לא-פתור עם ניסיון-בעיצומו.
   שחזור-הפופאפ בחזרה (Back) למסך פתור מטופל בנפרד ב-goTo() (ראו שם) —
   לא כאן, לפי _global-components.md → "Reopening feedback on return to
   a resolved screen" ("Scoped specifically to the Back button"). ===== */
function resetScreenState3() {
  // no-op מתועד — ראו הערה למעלה.
}

/* =========================================================
   מסך 5 — סגירת ה"הוק" + נוסחת הצפיפות (HookClosing)
   Figma node 3684:30877 (section 3684:30820). ראו index.html/
   ARCHITECTURE.md לפירוט המלא. אין state לשחזר: אין שאלה/אינפוט/הפיכה
   במסך הזה, ה-Continue תמיד פעיל (ללא gate), והדמות המלווה היא קבוע
   פשוט אחד (assets/videos/turquoise_point.mp4, מוטבע ישירות ב-<source>
   ב-HTML) — לא מנגנון asset-map הדרוש resolve-מחדש בכל כניסה (ראו
   index.html: "אין מסך בחירת-דמות ביחידה הזו"). ה-video עצמו ממשיך
   ברקע (autoplay+loop) בין ביקורים במסך — אין צורך לאתחל/לעצור אותו,
   בדיוק כמו שאין טיפול-השהיה מקביל ל-.fito-video (מסך 1) בין מסכים. ===== */
function resetScreenState4() {
  // no-op מתועד — ראו הערה למעלה.
}

/* =========================================================
   מסך 6 — טבלת צפיפויות + דמות קוסם (תסריט שקף 11, Figma 3663:29503)
   הערת מפיקה: כותרת → טקסט → טבלה → דמות (data-reveal 1–4), ואז הדמות
   "מקישה בשרביט" ושורה אחת נחשפת בכל נגיעה, בקצב איטי-מעט. בסוף — הדמות
   זזה שמאלה ובועת הדיבור עולה.

   סרטון הדמות (turquoise-avatar-magic-wand.mp4, 5.09s, נבדק פריים-פריים):
   השרביט "מקיש" (הכוכב קופץ קדימה-ימינה) שלוש פעמים בלבד — ב-1.43s,
   1.93s ו-2.30s — ואז עומד ~1s ולבסוף יורד לפוזת מנוחה (מ-3.6s).
   לטבלה 5 שורות, ולכן הקטע עם ההקשות מנוגן פעמיים (S5_SEGMENTS):
   הקשות 1–3 → שורות 1–3; קפיצה חזרה ל-1.30s → הקשות 1–2 של הקטע
   → שורות 4–5; קפיצה ל-2.45s והמשך עד הסוף (הורדת השרביט).
   כל שורה נחשפת ברגע ההקשה שלה (S5_TAPS), בזמן-וידאו — לא בטיימר.
   נגן בקצב איטי-מעט (rate < 1) סביב ההקשות כדי לעמוד ב"קצת איטי".
   - בסיום: הדמות זזה לצד (s5MoveCharToSide), אחר כך הבועה, והסרטון עובר
     ללולאה (loop, מהתחלה, קצב רגיל).
   כפתור "המשך" פעיל תמיד. כניסה חוזרת / עזיבה באמצע: הכול גלוי מיד,
   הדמות בצד והסרטון בלולאה (כמו Motion — הנפשת-כניסה פעם אחת לסשן).
   ========================================================= */
const S5_ROW_COUNT = 5;
const S5_START_DELAY_MS = 1500;   // אחרי סיום חשיפות 1–4 (~1.2s)
const S5_MOVE_MS = 700;           // תנועת הדמות לצד
const S5_CHAR_SHIFT_PX = 360;     // חייב להיות זהה ל-.s5-at-table ב-CSS
/* רגעי ההקשה בסרטון (שניות) — נמדדו מתנועת הכוכב. */
const S5_TAPS = [1.43, 1.93, 2.30];
/* קטעי ניגון ברצף. to=null → עד סוף הסרטון. rate<1 = איטי יותר. */
const S5_SEGMENTS = [
  { from: 0,    to: 1.30, rate: 1 },     // הרמת השרביט
  { from: 1.30, to: 2.45, rate: 0.4 },   // הקשות 1–3 → שורות 1–3
  { from: 1.30, to: 2.02, rate: 0.4 },   // הקשות 1–2 שוב → שורות 4–5
  { from: 2.45, to: null, rate: 1 }      // עמידה והורדת השרביט
];

let s5SeqDone = false;
let s5Token = 0;      // מבטל רצף ישן (rAF/טיימרים/אנימציה)
let s5Timers = [];
let s5MoveAnim = null;

function s5Later(fn, ms) { s5Timers.push(setTimeout(fn, ms)); }
function s5Cancel() {
  s5Token++;
  s5Timers.forEach(clearTimeout);
  s5Timers = [];
  if (s5MoveAnim) { s5MoveAnim.cancel(); s5MoveAnim = null; }
}
function s5Reduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function s5Els() {
  return {
    screen: document.getElementById('s5'),
    wrap: document.getElementById('s5-char-wrap'),
    video: document.getElementById('s5-char-video'),
    bubble: document.getElementById('s5-bubble')
  };
}

function s5StartLoop() {
  const v = s5Els().video;
  v.loop = true;
  v.playbackRate = 1;
  try { v.currentTime = 0; } catch (e) {}
  const p = v.play();
  if (p && p.catch) p.catch(function () {});
}

/* מצב סופי: כל השורות, הדמות בצד, הבועה גלויה, סרטון בלולאה. */
function s5ShowAll() {
  const e = s5Els();
  if (!e.screen) return;
  e.screen.classList.remove('s5-seq');
  e.screen.classList.add('s5-bubble-on');
  e.wrap.classList.remove('s5-at-table');
  e.screen.querySelectorAll('.s5-row').forEach(function (r) {
    r.classList.add('is-revealed');
    r.classList.remove('is-animating');
  });
  e.bubble.classList.remove('is-animating');
  s5StartLoop();
}
/* מצב פתיחה: טבלה ללא נתונים, דמות ליד הטבלה, סרטון על הפריים הראשון. */
function s5Arm() {
  const e = s5Els();
  if (!e.screen) return;
  e.screen.classList.add('s5-seq');
  e.screen.classList.remove('s5-bubble-on');
  e.wrap.classList.add('s5-at-table');
  e.screen.querySelectorAll('.s5-row').forEach(function (r) {
    r.classList.remove('is-revealed', 'is-animating');
  });
  e.video.pause();
  e.video.loop = false;
  e.video.playbackRate = S5_SEGMENTS[0].rate;
  try { e.video.currentTime = 0; } catch (err) {}
}
function s5RevealRow(i) {
  const row = document.querySelector('#s5 .s5-row[data-row="' + i + '"]');
  if (row) row.classList.add('is-revealed', 'is-animating');
}

function s5MoveCharToSide(token, done) {
  const e = s5Els();
  e.wrap.classList.remove('s5-at-table');
  s5MoveAnim = e.wrap.animate(
    [{ transform: 'translateX(' + S5_CHAR_SHIFT_PX + 'px)' }, { transform: 'translateX(0)' }],
    { duration: S5_MOVE_MS, easing: 'ease-in-out' }
  );
  s5MoveAnim.onfinish = function () {
    s5MoveAnim = null;
    if (token === s5Token) done();
  };
}

function s5RunSequence() {
  const token = ++s5Token;
  const e = s5Els();
  const v = e.video;
  let nextRow = 0;
  let segIdx = 0;
  let lastT = -1;

  function enterSegment(i) {
    segIdx = i;
    const seg = S5_SEGMENTS[i];
    v.playbackRate = seg.rate;
    if (i > 0) { try { v.currentTime = seg.from; } catch (err) {} }
    lastT = seg.from - 0.001;
  }

  function finish() {
    if (token !== s5Token) return;
    while (nextRow < S5_ROW_COUNT) s5RevealRow(nextRow++);
    s5MoveCharToSide(token, function () {
      e.screen.classList.add('s5-bubble-on');
      e.bubble.classList.add('is-animating');
      s5StartLoop();
      s5SeqDone = true;
    });
  }

  function tick() {
    if (token !== s5Token) return;
    const t = v.currentTime;
    const seg = S5_SEGMENTS[segIdx];
    /* הקשה = חציית זמן-הקשה בתוך הקטע הנוכחי → חושפים את השורה הבאה */
    S5_TAPS.forEach(function (tap) {
      if (lastT < tap && tap <= t && nextRow < S5_ROW_COUNT) s5RevealRow(nextRow++);
    });
    lastT = t;
    if (seg.to !== null && t >= seg.to && segIdx < S5_SEGMENTS.length - 1) {
      enterSegment(segIdx + 1);
    }
    if (v.ended) { finish(); return; }
    requestAnimationFrame(tick);
  }

  enterSegment(0);
  const p = v.play();
  if (p && p.catch) {
    /* autoplay נחסם/נכשל — לא נתקעים: מציגים את המצב הסופי */
    p.catch(function () { if (token === s5Token) { s5ShowAll(); s5SeqDone = true; } });
  }
  requestAnimationFrame(tick);
}

function resetScreenState5() {
  s5Cancel();
  if (s5SeqDone) s5ShowAll(); else s5Arm();
}

/* עוזבים באמצע הרצף → נחשב "נראה" (כמו Motion.cancel): חזרה = הכול גלוי. */
function s5Leave() {
  s5Cancel();
  s5SeqDone = true;
  s5ShowAll();
  s5Els().video.pause();
}

function startScreen5() {
  if (s5SeqDone) { s5ShowAll(); return; }
  if (s5Reduced()) { s5SeqDone = true; s5ShowAll(); return; }
  s5Arm();
  s5Later(s5RunSequence, S5_START_DELAY_MS);
}

/* =========================================================
   מסכים 7–8 — הדגשת שורה בטבלה (תסריט שקפים 12–13)
   s6 = "מים" (שורה 4), s7 = "גז" (שורה 5). אותו מבנה כמו מסך 6 בלי הדמות.
   תוכן עולה בהדרגה (data-reveal, animation-system), ואחרי שהחשיפה מסתיימת
   השורה .s5-hl נצבעת בצהוב ב-fade עדין. כניסה חוזרת/עזיבה באמצע: צהוב מיד.
   ========================================================= */
const HL_DELAY_MS = 1500; // אחרי סיום חשיפות 1–3 (~1.0s)
const hlSeen = {};
const hlTimers = {};

function hlSet(id, on, animate) {
  const row = document.querySelector('#' + id + ' .s5-hl');
  if (!row) return;
  row.classList.toggle('hl-on', on);
  row.classList.toggle('hl-anim', !!animate && on);
}
function resetScreenStateHl(id) {
  clearTimeout(hlTimers[id]);
  hlSet(id, !!hlSeen[id], false);
}
function startScreenHl(id) {
  clearTimeout(hlTimers[id]);
  if (hlSeen[id]) { hlSet(id, true, false); return; }
  if (s5Reduced()) { hlSeen[id] = true; hlSet(id, true, false); return; }
  hlSet(id, false, false);
  hlTimers[id] = setTimeout(function () {
    hlSeen[id] = true;
    hlSet(id, true, true);
  }, HL_DELAY_MS);
}
function leaveHl(id) {
  clearTimeout(hlTimers[id]);
  hlSeen[id] = true;
  hlSet(id, true, false);
}

/* =========================================================
   מסך 9 — שאלת בחירה יחידה עם תמונה (SingleChoiceQuestionImage)
   Figma: 196:3445 / 615:10605 / 196:3458 / 196:3471 / 615:10183.
   תבנית: 720-templates → SingleChoiceQuestion.md + _question-template-
   defaults.md. תסריט: שקף 14. לוגיקה זהה למסך 4 (s3q*), עם מזהים נפרדים
   (s8q*) כדי לא לגעת בקוד מסך 4.
   correctId='a' (תואם משוב "לכל חומר יש ערך צפיפות אופייני לו"),
   maxAttempts=2 (לפי הנחיית מפיקה: "שני ניסיונות"). הרמז זמין מההתחלה
   וניתן לפתיחה חוזרת עד פתרון. אין סרגל התקדמות. אין View My Answer Toggle.
   ========================================================= */
const S8Q = { correctId: 'a', maxAttempts: 2 };
let s8qSelected = null;
let s8qAttempts = 0;
let s8qDone = false;
let s8qLastWrong = null;   // Retry gate
let s8qLastOutcome = null; // 'correct' | 'wrong2' — שחזור פופאפ בחזרה (Back)

/* משוב (שקף 14). ברירת-מחדל "Feedback: shared explanation": correct/wrong2
   חולקים את גוף ההסבר. wrong2.title מקבל את השורה הקבועה "התשובה הנכונה
   מוצגת." (_global-components.md → Terminal-incorrect title). רקעים:
   correct = Feedback/Correct/200 #f2ffe8 (Figma 525:9012); שגוי = Red/10. */
const S8Q_EXPLAIN = [
  'لكل مادة قيمة كثافة مميزة لها ("بصمة").',
  'لذلك، إذا قُمنا بقياس كثافة مادة غير معروفة، يمكن مقارنتها بقيم كثافة المواد المعروفة ومحاولة التعرف عليها.'
];
const S8Q_POPUP_CFG = {
  retry:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['هل نحاول مرة أخرى؟'] },
  correct: { bg: '#f2ffe8', title: 'ممتاز!', body: S8Q_EXPLAIN },
  wrong2: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S8Q_EXPLAIN }
};

function s8qOptEl(id) {
  return document.querySelector('#s8 .s3q-opt[data-id="' + id + '"]');
}

function s8qSelect(id) {
  if (s8qDone) return;
  /* בחירה-מחדש מסלקת את פופאפ ה-retry ומנקה סימון-שגוי קודם */
  document.getElementById('s8q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s8 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s8qOptEl(id);
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s8qSelected = id;
  const checkBtn = document.getElementById('s8q-check');
  if (checkBtn) checkBtn.disabled = (s8qLastWrong !== null && id === s8qLastWrong);
}

function s8qMark(id, cls) {
  const el = s8qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}

function s8qResetPopupPosition() {
  const popup = document.getElementById('s8q-popup');
  if (!popup) return;
  popup.style.left = '';
  popup.style.top = '';
  popup.style.bottom = '';
}

function s8qShowPopup(type) {
  const cfg = S8Q_POPUP_CFG[type];
  const popup = document.getElementById('s8q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  s8qResetPopupPosition();
  document.getElementById('s8q-popup-title').innerHTML = cfg.title;
  document.getElementById('s8q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}

function s8qReopenPopup() {
  if (s8qLastOutcome) s8qShowPopup(s8qLastOutcome);
}

function s8qCheck() {
  if (s8qDone) { advanceScreen(); return; } /* הכפתור הופך לפעולת-ההמשך אחרי פתרון */
  if (!s8qSelected) return;
  s8qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('004', 'q1', s8qSelected === S8Q.correctId, s8qSelected === S8Q.correctId || s8qAttempts >= S8Q.maxAttempts, { choices: [xapiOptIdx(s8qSelected)] });

  document.getElementById('s8q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  if (s8qSelected === S8Q.correctId) {
    s8qMark(S8Q.correctId, 'correct');
    s8qShowPopup('correct');
    s8qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s8qAttempts < S8Q.maxAttempts) {
    /* ניסיון ראשון שגוי — retry, הנכונה לא נחשפת */
    s8qMark(s8qSelected, 'wrong');
    s8qLastWrong = s8qSelected;
    s8qShowPopup('retry');
    const checkBtn = document.getElementById('s8q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    /* ניסיון סופי שגוי — חושף את הנכונה, נועל */
    s8qMark(s8qSelected, 'wrong');
    s8qMark(S8Q.correctId, 'correct');
    s8qShowPopup('wrong2');
    s8qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s8qFinish(outcome) {
  s8qDone = true;
  s8qLastOutcome = outcome;
  document.querySelectorAll('#s8 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s8q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    /* אין תווית-המשך מאושרת בתסריט → ברירת-המחדל הקנונית של התבנית */
    checkBtn.textContent = 'متابعة';
  }
  document.getElementById('s8q-hint')?.classList.add('s8q-hint-done');
  s8qCloseHint();
}

function s8qOpenHint() {
  if (s8qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('004', 'q1');
  document.getElementById('s8q-hint-overlay')?.classList.remove('hidden');
}
function s8qCloseHint() {
  document.getElementById('s8q-hint-overlay')?.classList.add('hidden');
}
function s8qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s8qCloseHint();
}
/* ניווט מסך 9 מסלק את שני הפופאפים (contextual to screen) */
function s8qClosePopups() {
  document.getElementById('s8q-popup')?.classList.add('hidden');
  s8qCloseHint();
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s8qPopupDrag = null;
function s8qPopupMouseDown(e) {
  const popup = document.getElementById('s8q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft;
  const top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s8qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s8qPopupDrag) return;
  const popup = document.getElementById('s8q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s8qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s8qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s8qPopupDrag = null; });

/* resume-state lock: ה-DOM לא נהרס בין מסכים, ולכן אין מה לאפס בכניסה חוזרת.
   שחזור הפופאפ בחזרה (Back) למסך פתור — ב-goTo. */
function resetScreenState8() {
  // no-op מתועד
}

/* מסך 13 (TransitionScreen) — וידאו דקורטיבי: מתנגן פעם אחת, בלי לולאה,
   ונשאר על הפריים האחרון. בכניסה חוזרת לא מאפסים קליפ שכבר הסתיים. */
function resetScreenState12() {
  const vid = document.getElementById('s12-char-video');
  if (vid && !vid.ended) vid.play().catch(function () {});
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

/* =========================================================
   מסכים 10–12 — בניית צירי הגרף (תסריט שקפים 15–17)
   מסך 10: טקסט ואחריו מספרים; 1 מהבהב (לחיצה → מסך 11).
   מסך 11: ציר X "מסורטט" (חשיפת-מסכה שמאל→ימין), בועה, ואז 2 מהבהב.
   מסך 12: ציר Y "מסורטט" (מלמטה למעלה), בועה, ואז "המשך" מהבהב.
   כניסה חוזרת / עזיבה באמצע: הכול גלוי מיד (כמו Motion — הנפשה פעם אחת).
   המשך במסך 12 מוביל למסך הבא (שקף 18 — עוד לא נבנה; TOTAL_SCREENS קובע).
   ========================================================= */
const AX_START_DELAY_MS = 900;   // אחרי סיום חשיפת הטקסט
const AX_DRAW_MS = 1200;         // חייב להיות זהה ל-animation ב-CSS
const AX_BUBBLE_DELAY_MS = 150;  // אחרי סיום ה"שרטוט"
const AX_NEXT_DELAY_MS = 700;    // אחרי עליית הבועה — המספר/ההמשך מתחיל להבהב
const axState = { s10: { done: false, timers: [] }, s11: { done: false, timers: [] } };

function axScreen(id) { return document.getElementById(id); }
function axClear(id) { axState[id].timers.forEach(clearTimeout); axState[id].timers = []; }
function axLater(id, fn, ms) { axState[id].timers.push(setTimeout(fn, ms)); }
function axReduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
function axPulseBtn(id, on) {   // "המשך" אפור ולא פעיל עד סוף מסך 12 — בלי הבהוב
  if (id === 's11') document.getElementById('s11-continue').disabled = !on;
}

function axShowAll(id) {
  const s = axScreen(id);
  s.classList.remove('ax-arm');
  s.classList.add('ax-draw', 'ax-bubble', 'ax-next');
  s.querySelectorAll('.is-animating').forEach(function (e) { e.classList.remove('is-animating'); });
  s.querySelectorAll('.s9-num--late').forEach(function (e) { e.disabled = false; });
  /* מצב סופי בלי אנימציית-שרטוט חוזרת */
  s.querySelectorAll('.s9-draw--x, .s9-draw--y').forEach(function (e) { e.style.animation = 'none'; });
  axPulseBtn(id, true);
}
function axArm(id) {
  const s = axScreen(id);
  s.classList.add('ax-arm');
  s.classList.remove('ax-draw', 'ax-bubble', 'ax-next');
  s.querySelectorAll('.is-animating').forEach(function (e) { e.classList.remove('is-animating'); });
  s.querySelectorAll('.s9-draw--x, .s9-draw--y').forEach(function (e) { e.style.animation = ''; });
  s.querySelectorAll('.s9-num--late').forEach(function (e) { e.disabled = true; });
  axPulseBtn(id, false);
}
function axRun(id) {
  const s = axScreen(id);
  s.classList.add('ax-draw');                       // "מסרטט"
  axLater(id, function () {
    s.classList.add('ax-bubble');
    s.querySelectorAll('.s9-bubble--new').forEach(function (e) { e.classList.add('is-animating'); });
    axLater(id, function () {
      s.classList.add('ax-next');
      s.querySelectorAll('.s9-num--late').forEach(function (e) { e.disabled = false; });
      axPulseBtn(id, true);
      axState[id].done = true;
    }, AX_NEXT_DELAY_MS);
  }, AX_DRAW_MS + AX_BUBBLE_DELAY_MS);
}
function resetScreenStateAx(id) {
  axClear(id);
  if (axState[id].done) axShowAll(id); else axArm(id);
}
function startScreenAx(id) {
  s9RenderBubbles(axScreen(id));
  axClear(id);
  if (axState[id].done) { axShowAll(id); return; }
  if (axReduced()) { axState[id].done = true; axShowAll(id); return; }
  axArm(id);
  axLater(id, function () { axRun(id); }, AX_START_DELAY_MS);
}
function leaveAx(id) {
  axClear(id);
  axState[id].done = true;
  axShowAll(id);
}

/* בועות-דיבור (מסכים 11–12): קו-מתאר רציף עם מקור משולב — Figma 1731:45005.
   נמדד אחרי שהמסך גלוי (display:none מחזיר גודל 0). */
function s9BubblePath(w, h, dir, beakAt) {
  const r = 9.5, o = 1.5, L = 14.4, half = 15.7; // Figma 3139:28961: רדיוס 9.5, בסיס-מקור 31.5, בליטה 14.4
  const bx = dir === 'left' ? L : 0;           // תחילת גוף הבועה
  const x1 = bx + o, x2 = bx + w - o, y1 = o, y2 = h - o;
  if (dir === 'down') {
    /* מקור למטה (Figma 716:24318, BeakAngle=Bottom): beakAt = מיקום המקור לאורך הרוחב */
    const cx = Math.max(x1 + r + half, Math.min(x2 - r - half, w * beakAt));
    return 'M' + (x1 + r) + ' ' + y1 + ' H' + (x2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + (y1 + r) +
           ' V' + (y2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x2 - r) + ' ' + y2 +
           ' H' + (cx + half) + ' L' + cx + ' ' + (h + L - o) + ' L' + (cx - half) + ' ' + y2 +
           ' H' + (x1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y2 - r) +
           ' V' + (y1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x1 + r) + ' ' + y1 + ' Z';
  }
  const cy = Math.max(y1 + r + half, Math.min(y2 - r - half, h * beakAt));
  const tipX = dir === 'left' ? o : w + L - o;
  let d = 'M' + (x1 + r) + ' ' + y1 + ' H' + (x2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + (y1 + r);
  if (dir === 'right') {
    d += ' V' + (cy - half) + ' L' + tipX + ' ' + cy + ' L' + x2 + ' ' + (cy + half);
  }
  d += ' V' + (y2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x2 - r) + ' ' + y2 + ' H' + (x1 + r) +
       ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y2 - r);
  if (dir === 'left') {
    d += ' V' + (cy + half) + ' L' + tipX + ' ' + cy + ' L' + x1 + ' ' + (cy - half);
  }
  d += ' V' + (y1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x1 + r) + ' ' + y1 + ' Z';
  return d;
}
function s9RenderBubbles(root) {
  (root || document).querySelectorAll('.s9-bubble').forEach(function (b) {
    const body = b.querySelector('.s9-bubble__body');
    const down = b.classList.contains('s9-bubble--down');
    const w = b.offsetWidth - (down ? 0 : 14.4), h = body.offsetHeight;
    if (!w || !h) return;
    const dir = down ? 'down' : b.classList.contains('s9-bubble--left') ? 'left' : 'right';
    const beakAt = b.dataset.beak ? parseFloat(b.dataset.beak) : 0.5; // Figma 3139:28961 (BeakAngle=Left): המקור ממורכז; down — data-beak
    let svg = b.querySelector('.s9-bubble__svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 's9-bubble__svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      b.insertBefore(svg, b.firstChild);
    }
    svg.setAttribute('width', b.offsetWidth);
    const sh = h + (down ? 14.4 : 0);
    svg.setAttribute('height', sh);
    svg.setAttribute('viewBox', '0 0 ' + b.offsetWidth + ' ' + sh);
    svg.firstChild.setAttribute('d', s9BubblePath(w, h, dir, beakAt));
  });
}

/* =========================================================
   מסך 14 (s13) — שקפים 19–22 כמסך אחד. כל לחיצה על החץ מעבירה נקודה
   מהטבלה לגרף. ראו הערה ב-index.html.
   ה-state נשמר בין כניסות (marked = כמה נקודות סומנו, rows = כמה שורות
   מוצגות); חזרה למסך מציגה את המצב מיד, בלי אנימציה.
   גיאומטריית הגרף נמדדה מתמונת axes-graph.png (נגזרת מ-axes-img03 הערוכה; אחוזים ממסגרת התמונה):
   ראשית (0,0) = (11.56%, 80.5%); צעד לנפח 1 סמ"ק = 16.75%; צעד ל-7.9 גרם = 16.42%.
   ========================================================= */
const S13_N = 4;          // מספר הנקודות/השורות; הבועות, התוויות וקווי העזר כתובים ב-index.html (טקסט חי)
const S13_X0 = 11.56, S13_DX = 16.75, S13_Y0 = 80.5, S13_DY = 16.42;
const S13_GW = 713, S13_GH = 713 * 1628 / 2501;
const S13_NEXT_ROW_MS = 1300;   // אחרי הלחיצה — השורה הבאה (צהובה) נוספת
const s13State = { marked: 0, rows: 1, timer: null };

function s13El(id) { return document.getElementById(id); }

/* מיקום הבועות: המקור (beak) מעל הנקודה; נמדד אחרי שהמסך גלוי */
function s13Layout() {
  s13El('s13-layer').querySelectorAll('.s13-bubble').forEach(function (b) {
    const i = +b.dataset.k - 1, body = b.querySelector('.s9-bubble__body');
    const w = body.offsetWidth, bodyH = body.offsetHeight, tail = 16, o = 1.5, r = 10, half = 15.5;
    if (!w) return;
    const px = (S13_X0 + S13_DX * (i + 1)) / 100 * S13_GW;
    const py = (S13_Y0 - S13_DY * (i + 1)) / 100 * S13_GH;
    const cx = Math.max(r + half + o, Math.min(w - r - half - o, w * parseFloat(b.dataset.beak)));
    b.style.left = (px - cx) + 'px';
    b.style.top = (py - 12 - (bodyH + tail)) + 'px';
    let svg = b.querySelector('.s9-bubble__svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 's9-bubble__svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      b.insertBefore(svg, b.firstChild);
    }
    const H = bodyH + tail, x1 = o, x2 = w - o, y1 = o, y2 = bodyH - o;
    const d = 'M' + (x1 + r) + ' ' + y1 + ' H' + (x2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + (y1 + r) +
      ' V' + (y2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x2 - r) + ' ' + y2 +
      ' H' + (cx + half) + ' L' + cx + ' ' + (H - o) + ' L' + (cx - half) + ' ' + y2 +
      ' H' + (x1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y2 - r) +
      ' V' + (y1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x1 + r) + ' ' + y1 + ' Z';
    svg.setAttribute('width', w); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
    svg.firstChild.setAttribute('d', d);
  });
}

/* newPt / newRow: מספר הנקודה / השורה שזה עתה נוספו (לאנימציה), או 0 = בלי אנימציה */
function s13Render(newPt, newRow) {
  const marked = s13State.marked, rows = s13State.rows;
  const done = marked >= S13_N;
  s13El('s13-layer').querySelectorAll('[data-k]').forEach(function (e) {
    const k = +e.dataset.k, cls = e.classList;
    cls.remove('is-new');
    if (cls.contains('s13-pt')) {
      cls.toggle('is-on', k <= marked);
      cls.toggle('is-current', k === marked);
    } else {
      cls.toggle('is-on', k === marked);        // קווי-עזר ובועה — רק לנקודה הנוכחית
    }
    if (k === newPt) { void e.offsetWidth; cls.add('is-new'); }
  });
  s13El('s13-table').querySelectorAll('.s13-row').forEach(function (tr) {
    const k = +tr.dataset.row;
    tr.classList.remove('is-new');
    tr.classList.toggle('is-shown', k <= rows);
    /* הצהוב: השורה שממתינה להעברה; שורות שהועברו — אפור לא פעיל */
    tr.classList.toggle('is-done', k <= marked);
    tr.classList.toggle('is-current', !done && k === marked + 1 && k <= rows);
    if (k === newRow) { void tr.offsetWidth; tr.classList.add('is-new'); }
  });
  const waiting = !done && rows > marked;
  s13El('s13-arrow').classList.toggle('is-off', !waiting);
  s13El('s13-continue').disabled = !done;   // אפור עד שכל הנקודות הועברו, בלי הבהוב
}

function s13Step() {
  const st = s13State;
  if (st.timer || st.marked >= S13_N || st.rows <= st.marked) return;
  st.marked++;
  s13Render(st.marked, 0);
  s13El('s13-live').textContent = s13El('s13-layer').querySelector('.s13-bubble[data-k="' + st.marked + '"]').dataset.say;
  if (st.marked < S13_N) {
    st.timer = setTimeout(function () {
      st.timer = null; st.rows++;
      s13Render(0, st.rows);   // הבועה נשארת עד הלחיצה הבאה
    }, S13_NEXT_ROW_MS);
  }
}

function startScreen13() {
  s13Layout();
  s13Render(0, 0);
}
function s13Leave() {
  const st = s13State;
  if (st.timer) { clearTimeout(st.timer); st.timer = null; st.rows++; }
}

/* =========================================================
   מסך 15 (s14) — שקפים 23+24 כמסך אחד. ראו הערה ב-index.html.
   שלב 1: קו הברזל "נצייר" + בועה → הכפתור "להוספת חומר נוסף" נפתח.
   שלב 2 (אחרי לחיצה): קו עץ האורן "נצייר" + כותרת מתחלפת + בועה → "המשך" נדלק.
   ה-state נשמר בין כניסות; חזרה למסך מציגה את המצב מיד.
   ========================================================= */
const S14_TITLES = [
  'الآن نَصِل النقاط بخط، وها هو الرسم البياني للحجم / الكتلة كاملًا:',
  'لكل مادة نسبة كتلة / حجم مختلفة (قيمة كثافة مختلفة):'
];
const S14_START_MS = 900, S14_DRAW_MS = 1000, S14_BUBBLE_GAP_MS = 150;
const s14State = { iron: false, pine: false, timers: [] };

function s14El(id) { return document.getElementById(id); }
function s14Later(fn, ms) { s14State.timers.push(setTimeout(fn, ms)); }
function s14Clear() { s14State.timers.forEach(clearTimeout); s14State.timers = []; }
function s14Reduced() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* מיקום בועה: המקור ממוקם מעל נקודה (% ממסגרת הגרף); נמדד כשהמסך גלוי */
function s14Layout() {
  const G = s14El('s14-graph'), gw = G.offsetWidth, gh = G.offsetHeight;
  G.querySelectorAll('.s14-bubble').forEach(function (b) {
    const body = b.querySelector('.s9-bubble__body');
    const w = body.offsetWidth, bodyH = body.offsetHeight, tail = 16, o = 1.5, r = 10, half = 15.5;
    if (!w) return;
    const px = +b.dataset.tipx / 100 * gw, py = +b.dataset.tipy / 100 * gh;
    const cx = Math.max(r + half + o, Math.min(w - r - half - o, w * +b.dataset.beak));
    b.style.left = (px - cx) + 'px';
    b.style.top = (py - 12 - (bodyH + tail)) + 'px';
    let svg = b.querySelector('.s9-bubble__svg');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 's9-bubble__svg');
      svg.setAttribute('aria-hidden', 'true');
      svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'path'));
      b.insertBefore(svg, b.firstChild);
    }
    const H = bodyH + tail, x1 = o, x2 = w - o, y1 = o, y2 = bodyH - o;
    svg.firstChild.setAttribute('d',
      'M' + (x1 + r) + ' ' + y1 + ' H' + (x2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x2 + ' ' + (y1 + r) +
      ' V' + (y2 - r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x2 - r) + ' ' + y2 +
      ' H' + (cx + half) + ' L' + cx + ' ' + (H - o) + ' L' + (cx - half) + ' ' + y2 +
      ' H' + (x1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + (y2 - r) +
      ' V' + (y1 + r) + ' A' + r + ' ' + r + ' 0 0 1 ' + (x1 + r) + ' ' + y1 + ' Z');
    svg.setAttribute('width', w); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + H);
  });
}

/* מצב סופי של כל חומר (בלי אנימציה) או מצב "חמוש" (מוסתר) */
function s14Show(name, on) {
  const line = s14El('s14-' + name), bub = s14El('s14-b-' + name);
  line.classList.remove('is-drawing');
  line.classList.toggle('is-on', on);
  bub.classList.toggle('is-on', on);
  bub.classList.remove('is-new');
  s14El('s14-graph').classList.toggle('has-' + name, on);
}
function s14Buttons() {
  const st = s14State, btn = s14El('s14-next');
  s14El('s14-title').firstChild.textContent = S14_TITLES[st.pine ? 1 : 0];
  if (st.pine) {
    btn.textContent = 'متابعة'; btn.disabled = false; btn.onclick = advanceScreen;
  } else {
    btn.textContent = 'لإضافة مادة إضافية'; btn.disabled = !st.iron; btn.onclick = s14AddPine;
  }
}
/* מצייר חומר: קו → בועה → callback */
function s14Draw(name, done) {
  const line = s14El('s14-' + name), bub = s14El('s14-b-' + name);
  line.classList.add('is-on', 'is-drawing');
  s14Later(function () {
    bub.classList.add('is-on', 'is-new');
    s14El('s14-graph').classList.add('has-' + name);
    done();
  }, S14_DRAW_MS + S14_BUBBLE_GAP_MS);
}
function s14AddPine() {
  const st = s14State;
  if (!st.iron || st.pine || st.timers.length) return;
  s14El('s14-next').disabled = true;
  const t = s14El('s14-title');
  t.firstChild.textContent = S14_TITLES[1];
  t.classList.remove('is-swap'); void t.offsetWidth; t.classList.add('is-swap');
  s14Draw('pine', function () {
    st.pine = true; s14Clear(); s14Buttons();
    s14El('s14-live').textContent = 'تمت إضافة خط لخشب الصنوبر. كثافة خشب الصنوبر: 0.5 غرام لكل سم³';
  });
}
function startScreen14() {
  const st = s14State;
  s14Clear();
  s14Layout();
  s14Show('iron', st.iron); s14Show('pine', st.pine);
  s14Buttons();
  if (st.iron) return;
  if (s14Reduced()) { st.iron = true; s14Show('iron', true); s14Buttons(); return; }
  s14Later(function () {
    s14Draw('iron', function () { st.iron = true; s14Clear(); s14Buttons(); });
  }, S14_START_MS);
}
function s14Leave() {
  const st = s14State;
  if (s14El('s14-iron').classList.contains('is-drawing')) st.iron = true;
  if (s14El('s14-pine').classList.contains('is-drawing')) st.pine = true;
  s14Clear();
  s14Show('iron', st.iron); s14Show('pine', st.pine);
  s14Buttons();
}


/* =========================================================
   מסך 16 — שאלת בחירה יחידה עם גרף (SingleChoiceQuestionImage), שקף 25.
   לוגיקה זהה למסך 9 (s8q*), עם מזהים נפרדים (s15q*). correctId='a'
   ("לברזל צפיפות גבוהה יותר משל עץ האורן"), שני ניסיונות, הרמז זמין מההתחלה.
   משוב ורמז — מילה במילה מהתסריט (שקף 25). בועת ההסבר על "תלול" —
   s15ToggleTip (נסגרת בלחיצה בחוץ / Esc / ניווט).
   ========================================================= */
const S15Q = { correctId: 'a', maxAttempts: 2 };
let s15qSelected = null;
let s15qAttempts = 0;
let s15qDone = false;
let s15qLastWrong = null;
let s15qLastOutcome = null;

const S15Q_EXPLAIN = ['خط أكثر انحدارًا يعني كتلة أكبر لكل سم³،<br>ولذلك فإن كثافة الحديد أعلى.'];
const S15Q_POPUP_CFG = {
  retry:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['تحققوا من التلميح وحاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح!', body: S15Q_EXPLAIN },
  wrong2: { bg: '#ffdbdc', title: 'غير صحيح.<br>الإجابة الصحيحة معروضة.', body: S15Q_EXPLAIN }
};

function s15qOptEl(id) {
  return document.querySelector('#s15 .s3q-opt[data-id="' + id + '"]');
}
function s15qSelect(id) {
  if (s15qDone) return;
  document.getElementById('s15q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s15 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s15qOptEl(id);
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s15qSelected = id;
  const checkBtn = document.getElementById('s15q-check');
  if (checkBtn) checkBtn.disabled = (s15qLastWrong !== null && id === s15qLastWrong);
}
function s15qMark(id, cls) {
  const el = s15qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s15qShowPopup(type) {
  const cfg = S15Q_POPUP_CFG[type];
  const popup = document.getElementById('s15q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s15q-popup-title').innerHTML = cfg.title;
  document.getElementById('s15q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s15qReopenPopup() {
  if (s15qLastOutcome) s15qShowPopup(s15qLastOutcome);
}
function s15qCheck() {
  if (s15qDone) { advanceScreen(); return; }
  if (!s15qSelected) return;
  s15qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('006', 'q1', s15qSelected === S15Q.correctId, s15qSelected === S15Q.correctId || s15qAttempts >= S15Q.maxAttempts, { choices: [xapiOptIdx(s15qSelected)] });
  document.getElementById('s15q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  if (s15qSelected === S15Q.correctId) {
    s15qMark(S15Q.correctId, 'correct');
    s15qShowPopup('correct');
    s15qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s15qAttempts < S15Q.maxAttempts) {
    s15qMark(s15qSelected, 'wrong');
    s15qLastWrong = s15qSelected;
    s15qShowPopup('retry');
    const checkBtn = document.getElementById('s15q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    s15qMark(s15qSelected, 'wrong');
    s15qMark(S15Q.correctId, 'correct');
    s15qShowPopup('wrong2');
    s15qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s15qFinish(outcome) {
  s15qDone = true;
  s15qLastOutcome = outcome;
  document.querySelectorAll('#s15 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s15q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    checkBtn.textContent = 'متابعة'; /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  }
  document.getElementById('s15q-hint')?.classList.add('s8q-hint-done');
  s15qCloseHint();
}
function s15qOpenHint() {
  if (s15qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('006', 'q1');
  document.getElementById('s15q-hint-overlay')?.classList.remove('hidden');
}
function s15qCloseHint() {
  document.getElementById('s15q-hint-overlay')?.classList.add('hidden');
}
function s15qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s15qCloseHint();
}

/* בועת ההסבר על "תלול" */
function s15CloseTip() {
  document.getElementById('s15-tip')?.classList.add('hidden');
  document.getElementById('s15-info')?.setAttribute('aria-expanded', 'false');
}
function s15ShowTip() {
  document.getElementById('s15-tip')?.classList.remove('hidden');
  document.getElementById('s15-info')?.setAttribute('aria-expanded', 'true');
}
/* לחיצה (מגע) רק פותחת — ב-tap נורה mouseenter לפני click, ו-toggle היה סוגר מיד */
function s15ToggleTip(e) {
  e.stopPropagation();
  s15ShowTip();
}
document.addEventListener('click', function (e) {
  if (!e.target.closest || !e.target.closest('.s15-term')) s15CloseTip();
});

function s15qClosePopups() {
  document.getElementById('s15q-popup')?.classList.add('hidden');
  s15qCloseHint();
  s15CloseTip();
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s15qPopupDrag = null;
function s15qPopupMouseDown(e) {
  const popup = document.getElementById('s15q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s15qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s15qPopupDrag) return;
  const popup = document.getElementById('s15q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s15qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s15qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s15qPopupDrag = null; });


/* =========================================================
   מסך 28 — שאלת בחירה יחידה עם תמונה (SingleChoiceQuestionImage), שקף 39.
   לוגיקה זהה למסך 9 (s8q*) / מסך 16 (s15q*), עם מזהים נפרדים (s27q*).
   correctId='a' (מדידת המסה → חישוב צפיפות → השוואה), שני ניסיונות, הרמז זמין
   מההתחלה. משוב ורמז — מילה במילה מהתסריט (שקף 39). אין תווית-המשך בתסריט →
   'שנמשיך?' (ברירת-המחדל הקנונית).
   ========================================================= */
const S27Q = { correctId: 'a', maxAttempts: 2 };
let s27qSelected = null;
let s27qAttempts = 0;
let s27qDone = false;
let s27qLastWrong = null;
let s27qLastOutcome = null;

const S27Q_EXPLAIN = [
  'أرخميدس قاس كتلة التاج، وحسب كثافته، وقارنها بكثافة الذهب.',
  'إذا كانت الكثافة مختلفة، فإن التاج غير مصنوع من الذهب الخالص.'
];
const S27Q_POPUP_CFG = {
  retry:  { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['اقرأوا التلميح وحاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'الإجابة صحيحة.', body: S27Q_EXPLAIN },
  wrong2: { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: [
    'قاس أرخميدس أيضًا كتلة التاج، وحسب كثافته وقارنها بكثافة الذهب.',
    'إذا كانت الكثافة مختلفة، فإن التاج غير مصنوع من الذهب الخالص.'
  ] }
};

function s27qOptEl(id) {
  return document.querySelector('#s27 .s3q-opt[data-id="' + id + '"]');
}
function s27qSelect(id) {
  if (s27qDone) return;
  document.getElementById('s27q-popup')?.classList.add('hidden');
  document.querySelectorAll('#s27 .s3q-opt').forEach(function (el) {
    el.classList.remove('selected', 'wrong');
    el.setAttribute('aria-checked', 'false');
  });
  const el = s27qOptEl(id);
  el.classList.add('selected');
  el.setAttribute('aria-checked', 'true');
  s27qSelected = id;
  const checkBtn = document.getElementById('s27q-check');
  if (checkBtn) checkBtn.disabled = (s27qLastWrong !== null && id === s27qLastWrong);
}
function s27qMark(id, cls) {
  const el = s27qOptEl(id);
  if (!el) return;
  el.classList.remove('selected');
  el.classList.add(cls);
}
function s27qShowPopup(type) {
  const cfg = S27Q_POPUP_CFG[type];
  const popup = document.getElementById('s27q-popup');
  if (!popup || !cfg) return;
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s27q-popup-title').innerHTML = cfg.title;
  document.getElementById('s27q-popup-body').innerHTML =
    cfg.body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  popup.classList.remove('hidden');
}
function s27qReopenPopup() {
  if (s27qLastOutcome) s27qShowPopup(s27qLastOutcome);
}
function s27qCheck() {
  if (s27qDone) { advanceScreen(); return; }
  if (!s27qSelected) return;
  s27qAttempts++;
  /* xAPI: single choice — the option index (answers order = on-screen order a..d). */
  xapiAnswered('012', 'q1', s27qSelected === S27Q.correctId, s27qSelected === S27Q.correctId || s27qAttempts >= S27Q.maxAttempts, { choices: [xapiOptIdx(s27qSelected)] });
  document.getElementById('s27q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  if (s27qSelected === S27Q.correctId) {
    s27qMark(S27Q.correctId, 'correct');
    s27qShowPopup('correct');
    s27qFinish('correct');
    try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
    return;
  }
  if (s27qAttempts < S27Q.maxAttempts) {
    s27qMark(s27qSelected, 'wrong');
    s27qLastWrong = s27qSelected;
    s27qShowPopup('retry');
    const checkBtn = document.getElementById('s27q-check');
    if (checkBtn) checkBtn.disabled = true; /* retry gate */
  } else {
    s27qMark(s27qSelected, 'wrong');
    s27qMark(S27Q.correctId, 'correct');
    s27qShowPopup('wrong2');
    s27qFinish('wrong2');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}
function s27qFinish(outcome) {
  s27qDone = true;
  s27qLastOutcome = outcome;
  document.querySelectorAll('#s27 .s3q-opt').forEach(function (el) {
    el.classList.add('disabled');
    el.onclick = null;
  });
  const checkBtn = document.getElementById('s27q-check');
  if (checkBtn) {
    checkBtn.disabled = false;
    checkBtn.textContent = 'متابعة'; /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  }
  document.getElementById('s27q-hint')?.classList.add('s8q-hint-done');
  s27qCloseHint();
}
function s27qOpenHint() {
  if (s27qDone) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('012', 'q1');
  document.getElementById('s27q-hint-overlay')?.classList.remove('hidden');
}
function s27qCloseHint() {
  document.getElementById('s27q-hint-overlay')?.classList.add('hidden');
}
function s27qCloseHintOnBackdrop(e) {
  if (e.target === e.currentTarget) s27qCloseHint();
}

function s27qClosePopups() {
  document.getElementById('s27q-popup')?.classList.add('hidden');
  s27qCloseHint();
}

/* גרירת פופאפ-המשוב — בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s27qPopupDrag = null;
function s27qPopupMouseDown(e) {
  const popup = document.getElementById('s27q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s27qPopupDrag = {
    offX: (e.clientX - rect.left) / scale - left,
    offY: (e.clientY - rect.top) / scale - top
  };
  e.preventDefault();
}
window.addEventListener('mousemove', function (e) {
  if (!s27qPopupDrag) return;
  const popup = document.getElementById('s27q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s27qPopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s27qPopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
});
window.addEventListener('mouseup', function () { s27qPopupDrag = null; });



/* נעילת רוחב כפתורים בהובר — unit-js/07-btn-width.js */


/* =========================================================
   מסך 17 — טקסט + יישומון גרירה (שקף 26)
   הערת מפיקה: "אחרי ניסיון אחד נדלק כפתור 'המשך'. ניתן לשחק ביישומון ללא
   הגבלה." היישומון עצמו (כרגע פלייסהולדר #s16-applet) קורא ל-
   s16AppletAttempted() ברגע שהלומד משחרר קוביה לכוס. ההמשך נשאר דלוק גם
   בחזרה למסך (המצב נשמר, אין "ניסיון חדש").
   ========================================================= */
let s16Attempted = false;
function s16AppletAttempted() {
  s16Attempted = true;
  const btn = document.getElementById('s16-next');
  if (btn) btn.disabled = false;
}
function resetScreenState16() {
  const btn = document.getElementById('s16-next');
  if (btn) btn.disabled = !s16Attempted;
}

/* =========================================================
   מסך 21 — רגע למחשבה + יישומון גרירה (שקף 30). בדיוק כמו מסך 17:
   "אחרי ניסיון אחד נדלק כפתור 'המשך'. ניתן לשחק ביישומון ללא הגבלה."
   applet/applet2.js קורא ל-s20AppletAttempted() ברגע שהלומד משחרר גוף לכוס.
   ========================================================= */
let s20Attempted = false;
function s20AppletAttempted() {
  s20Attempted = true;
  const btn = document.getElementById('s20-next');
  if (btn) btn.disabled = false;
}
function resetScreenState20() {
  const btn = document.getElementById('s20-next');
  if (btn) btn.disabled = !s20Attempted;
}


/* =========================================================
   מסך 18 — מסקנה מהיישומון (שקף 27)
   הערת מפיקה: "אלמנטים עולים בהדרגה על המסך. לאחר הופעת כל האלמנטים כפתור
   המשך נדלק." קצב איטי כמו מסך 15: טקסט + מים (data-reveal, motion.js), ואז
   צעד 0 (כרטיס "צף" + עץ אורן) וצעד 1 (כרטיס "שוקע" + ברזל) ב-JS, כל צעד ב-
   float של 700ms ובהפרש 1.1s; ההמשך נדלק בסוף. כניסה חוזרת / עזיבה באמצע /
   reduced-motion: הכול מוצג מיד וההמשך דלוק.
   ========================================================= */
const S17_FIRST_MS = 1300, S17_STEP_MS = 1100, S17_ANIM_MS = 700;
let s17Done = false;
let s17Timers = [];
function s17Clear() { s17Timers.forEach(clearTimeout); s17Timers = []; }
function s17Later(fn, ms) { s17Timers.push(setTimeout(fn, ms)); }
function s17Els(step) {
  return document.querySelectorAll('#s17 .s17-seq' + (step == null ? '' : '[data-step="' + step + '"]'));
}
function s17Show(step, animate) {
  s17Els(step).forEach(function (el) {
    el.classList.add('is-in');
    el.classList.toggle('is-anim', !!animate);
  });
}
function s17SetAll(on) {
  s17Els().forEach(function (el) { el.classList.remove('is-anim'); el.classList.toggle('is-in', on); });
}
function s17Unlock() {
  s17Clear();
  s17Done = true;
  s17SetAll(true);
  const btn = document.getElementById('s17-next');
  if (btn) btn.disabled = false;
}
function resetScreenState17() {
  s17Clear();
  s17SetAll(s17Done);
  const btn = document.getElementById('s17-next');
  if (btn) btn.disabled = !s17Done;
}
function startScreen17() {
  if (s17Done) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { s17Unlock(); return; }
  s17Later(function () { s17Show(0, true); }, S17_FIRST_MS);
  s17Later(function () { s17Show(1, true); }, S17_FIRST_MS + S17_STEP_MS);
  s17Later(s17Unlock, S17_FIRST_MS + S17_STEP_MS + S17_ANIM_MS);
}
function s17Leave() { s17Unlock(); }

/* =========================================================
   מסך 19 — הגרף עם קו המים (שקף 28)
   הערת מפיקה: "אלמנטים עולים בהדרגה על המסך. לאחר הופעת כל האלמנטים כפתור
   המשך נדלק." קצב איטי כמו מסך 15: טקסט + גרף (data-reveal), ואז הקווים
   מצטיירים בזה אחר זה — ברזל → עץ אורן → מים (1s ציור לכל קו, אותה אנימציית
   .is-drawing של מסך 15) כשפריט המקרא של כל קו עולה איתו; ההמשך נדלק בסוף.
   כניסה חוזרת / עזיבה באמצע / reduced-motion: הכול מוצג מיד וההמשך דלוק.
   ========================================================= */
const S18_ORDER = ['water', 'iron', 'pine']; /* בקשת לקוחה: קו המים עולה ראשון */
const S18_START_MS = 900, S18_DRAW_MS = 1000, S18_GAP_MS = 250;
let s18Done = false;
let s18Timers = [];
function s18Clear() { s18Timers.forEach(clearTimeout); s18Timers = []; }
function s18Later(fn, ms) { s18Timers.push(setTimeout(fn, ms)); }
function s18Line(name) { return document.getElementById('s18-' + name); }
function s18Item(name) { return document.querySelector('#s18 .s18-legend__item[data-line="' + name + '"]'); }
function s18Set(name, on, animate) {
  const g = s18Line(name), li = s18Item(name);
  g.classList.toggle('is-on', on);
  g.classList.toggle('is-drawing', on && !!animate);
  document.getElementById('s18-graph').classList.toggle('has-' + name, on);
  li.classList.toggle('is-in', on);
  li.classList.toggle('is-anim', on && !!animate);
}
function s18SetAll(on) { S18_ORDER.forEach(function (n) { s18Set(n, on, false); }); }
function s18Unlock() {
  s18Clear();
  s18Done = true;
  s18SetAll(true);
  const btn = document.getElementById('s18-next');
  if (btn) btn.disabled = false;
}
function resetScreenState18() {
  s18Clear();
  s18SetAll(s18Done);
  const btn = document.getElementById('s18-next');
  if (btn) btn.disabled = !s18Done;
}
function startScreen18() {
  if (s18Done) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { s18Unlock(); return; }
  S18_ORDER.forEach(function (name, k) {
    s18Later(function () { s18Set(name, true, true); }, S18_START_MS + k * (S18_DRAW_MS + S18_GAP_MS));
  });
  s18Later(s18Unlock, S18_START_MS + (S18_ORDER.length - 1) * (S18_DRAW_MS + S18_GAP_MS) + S18_DRAW_MS + 150);
}
function s18Leave() { s18Unlock(); }


/* =========================================================
   Pointer-based drag-and-drop (עכבר + מגע) — מנגנון אחד מהלחיצה ועד השחרור:
   pointerdown / pointermove / pointerup / pointercancel (_common-pitfalls →
   "Pointer drags that never end"). מופע-הרפאים (שיבוט) נוסף ל-body ומוקטן כמו #app;
   תנועה קטנה מ-6px = הקשה (onTap) — מסלול חלופי בלי גרירה (מגע / מקלדת).
   ========================================================= */
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
    e.preventDefault(); // מונע בחירת טקסט / גלילה; אין תלות בארועי עכב-תאימות (mouse*)
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
    if (e.pointerType === 'mouse' && e.buttons === 0) { onUp(e); return; } // השחרור הוחמץ — הגרירה נגמרת
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
   מסך 20 — שאלת גרירה: יצוף / ישקע (שקף 29) — DragAndDropQuestion, וריאנט מקומי
   (אזורים מרובי-פריטים: ללא "אחד לכל יעד"). מפתח לפי הערת המפיקה (נגזר מהתסריט):
   יצוף — קרח, שמן, עץ אלון; ישקע — זהב, זכוכית, כסף.
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • בדיקה נפתחת כשכל 6 הכרטיסים הונחו; Retry gate אחרי שגוי לא-סופי: "צדקתי?" כבוי עד
     שההנחה שונה בפועל מהנחה השגויה האחרונה (השוואה חיה של מצב ההנחה המלא).
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle (מעבר לתשובה שלי / התשובה הנכונה);
     החלפה לא נוגעת בניסיונות/done; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על אזור מניחה,
     הקשה על המגש מחזירה כרטיס מונח.
   ========================================================= */
const S19 = {
  order: ['ice', 'gold', 'oil', 'glass', 'oak', 'silver'],
  correct: { gold: 'sink', glass: 'sink', silver: 'sink', ice: 'float', oil: 'float', oak: 'float' },
  zoneName: { float: 'يطفو في الماء', sink: 'يغرق في الماء' },
  maxAttempts: 2
};
const S19_EXPLAIN = 'لمعرفة ما إذا كانت مادة ما ستطفو أو تغرق في الماء، قارنوا كل كثافة بـ 1 غرام لكل سم³. لذلك، فإن المادة التي تغرق في الماء هي مادة كثافتها أكبر من 1، والمادة التي تطفو على سطح الماء هي مادة كثافتها أقل من 1.';
const S19_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'إجابة غير صحيحة.', body: ['اقرأوا التلميح وحاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'إجابة صحيحة.', body: [S19_EXPLAIN] },
  wrong2:  {
    bg: '#ffdbdc', title: 'إجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: [S19_EXPLAIN],
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    /* בקשת מפיק: ההחלפה בין "התשובה שלי" ל"התשובה הנכונה" מחליפה רק את הכפתור — המשוב המלא
       (כותרת + הסבר) נשאר זהה בשתי התצוגות; לא מקצרים אותו בתצוגת התשובה של הלומד */
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } }
  }
};

const s19Placement = {};      // cardId → 'source' | 'float' | 'sink'
S19.order.forEach(function (id) { s19Placement[id] = 'source'; });
let s19Marks = {};            // cardId → 'correct' | 'wrong' (אחרי בדיקה סופית בלבד)
let s19Selected = null;       // כרטיס שנבחר בהקשה/מקלדת
let s19Attempts = 0;
let s19Done = false;          // נעילת החזרה-למסך (resume) + שער ההמשך
let s19Outcome = null;        // 'correct' | 'wrong2'
let s19LastWrong = null;      // צילום ההנחה של הניסיון השגוי הלא-סופי האחרון
let s19Partial = false;       // לפחות כרטיס אחד במקום הנכון אך לא כולם (כמו יעד 11) → "התשובה נכונה חלקית."
let s19Answer = null;         // צילום תשובת הלומד בשגוי הסופי (null = לא ניתן להחלפה)
let s19View = 'solution';     // 'solution' | 'answer' — runtime בלבד
let s19Dnd = null;

function s19Snapshot() { return JSON.stringify(S19.order.map(function (id) { return s19Placement[id]; })); }
function s19AllPlaced() { return S19.order.every(function (id) { return s19Placement[id] !== 'source'; }); }
function s19Say(msg) { const el = document.getElementById('s19-live'); if (el) el.textContent = msg; }
function s19CardLabel(id) {
  const el = document.getElementById('s19-d-' + id);
  return el ? el.querySelector('.s19-card__name').textContent : id;
}

/* ניסיון חדש מתחיל → משוב ה-retry כבר לא מתאר את המצב (נתיב 2 ב-"No manual close") */
function s19DismissRetry() {
  if (s19Done) return;
  s19Marks = {}; // סימוני נכון/שגוי של הניסיון הקודם מתארים ניסיון שכבר לא נוכחי
  document.getElementById('s19q-popup')?.classList.add('hidden');
}

function s19Render() {
  S19.order.forEach(function (id) {
    const src = document.getElementById('s19-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s19Placement[id] !== 'source');
    src.classList.toggle('is-locked', s19Done);
    const sel = s19Selected === id;
    src.classList.toggle('is-selected', sel && s19Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s19Done ? 'true' : 'false');
  });
  ['float', 'sink'].forEach(function (z) {
    const zone = document.getElementById('s19-zone-' + z);
    zone.querySelectorAll('.s19-card').forEach(function (c) { c.remove(); });
    let n = 0;
    S19.order.forEach(function (id) {
      if (s19Placement[id] !== z) return;
      n++;
      const chip = document.createElement('div');
      chip.className = 's19-card is-placed';
      chip.dataset.id = id;
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      const icon = document.createElement('span');          /* ראשון ב-DOM → בקצה הימני (RTL), כמו ב-Figma */
      icon.className = 's19-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 's19-card__text';
      const srcEl = document.getElementById('s19-d-' + id);
      text.innerHTML = srcEl.querySelector('.s19-card__name').outerHTML + srcEl.querySelector('.s19-card__dens').outerHTML;
      chip.appendChild(icon);
      chip.appendChild(text);
      chip.classList.toggle('is-selected', s19Selected === id);
      chip.classList.toggle('is-locked', s19Done);
      chip.setAttribute('aria-pressed', s19Selected === id ? 'true' : 'false');
      chip.setAttribute('aria-label', s19CardLabel(id) + ' — ب' + S19.zoneName[z].replace(' في الماء', '') +
        (s19Marks[id] === 'correct' ? '، صحيح' : s19Marks[id] === 'wrong' ? '، غير صحيح' : ''));
      if (s19Marks[id]) chip.classList.add(s19Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
      zone.appendChild(chip);
      if (!s19Done && s19Dnd) s19Dnd.attachSource(chip, id);
      chip.addEventListener('keydown', s19CardKey);
    });
    zone.classList.toggle('occupied', n > 0);
    zone.classList.toggle('is-locked', s19Done);
  });
  s19UpdateCheck();
}

function s19UpdateCheck() {
  if (s19Done) return;
  const btn = document.getElementById('s19q-check');
  if (!btn) return;
  /* Retry gate: חייב להיות שונה בפועל מההנחה השגויה האחרונה */
  btn.disabled = !s19AllPlaced() || (s19LastWrong !== null && s19Snapshot() === s19LastWrong);
}

function s19InitDnd() {
  if (s19Dnd) return;
  s19Dnd = createPointerDnd({
    canDrag: function () { return !s19Done; },
    onPick: function (id) {
      dndGhStop('s19', true);
      s19DismissRetry();
      s19Selected = null;
      if (s19Placement[id] !== 'source') { s19Placement[id] = 'source'; }
      s19Render();
      document.getElementById('s19-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) {
      s19Placement[id] = zone;
      s19Say(s19CardLabel(id) + ' وُضِع في' + S19.zoneName[zone]);
      s19Render();
    },
    onCancel: function () { s19Render(); },
    onTap: function (id) { s19Tap(id); }
  });
  S19.order.forEach(function (id) { s19Dnd.attachSource(document.getElementById('s19-d-' + id), id); });
  document.querySelectorAll('#s19 .s19-zone').forEach(function (z) { s19Dnd.attachTarget(z, z.dataset.zone); });
  document.querySelectorAll('#s19 .s19-card').forEach(function (c) { c.addEventListener('keydown', s19CardKey); });
}

/* מסלול חלופי: בחירה בהקשה / Enter / רווח, הנחה בהקשה על אזור */
function s19Tap(id) {
  if (s19Done) return;
  dndGhStop('s19', true);
  s19DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על כרטיס שכבר מונח באזור → זו הנחה באותו אזור (הכרטיסים תופסים את שטח האזור) */
  if (s19Selected && s19Selected !== id && s19Placement[id] !== 'source') {
    const moved = s19Selected;
    s19Selected = null;
    s19Placement[moved] = s19Placement[id];
    s19Say(s19CardLabel(moved) + ' وُضِع في' + S19.zoneName[s19Placement[moved]]);
    s19Render();
    return;
  }
  s19Selected = (s19Selected === id) ? null : id;
  s19Say(s19Selected ? s19CardLabel(id) + ' تم الاختيار. اختاروا منطقة: سيطفو في الماء أو سيغرق في الماء.' : '');
  s19Render();
}
function s19CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s19Tap(e.currentTarget.dataset.id);
}
function s19ZoneClick(z, e) {
  if (e && e.target.closest && e.target.closest('.s19-card')) return; // הקשה על כרטיס מטופלת ב-s19Tap
  if (s19Done || !s19Selected) return;
  s19DismissRetry();
  const id = s19Selected;
  s19Selected = null;
  s19Placement[id] = z;
  s19Say(s19CardLabel(id) + ' وُضِع في' + S19.zoneName[z]);
  s19Render();
}
function s19ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s19ZoneClick(z);
}
function s19TrayClick(e) {
  if (s19Done || !s19Selected || (e.target.closest && e.target.closest('.s19-card'))) return;
  if (s19Placement[s19Selected] === 'source') return;
  s19DismissRetry();
  s19Placement[s19Selected] = 'source';
  s19Say(s19CardLabel(s19Selected) + ' تمت إعادته إلى الصينية');
  s19Selected = null;
  s19Render();
}

function s19Check() {
  if (s19Done) { advanceScreen(); return; }
  if (!s19AllPlaced()) return;
  s19Selected = null;
  s19Attempts++;
  document.getElementById('s19q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  const okCount = S19.order.filter(function (id) { return s19Placement[id] === S19.correct[id]; }).length;
  const ok = okCount === S19.order.length;
  /* xAPI: matching — placed cards only, both sides as catalogue indexes: S19.order is the catalogue's
     answers.source order (the card shows the name alone, the catalogue string carries the density);
     target 0 יצוף במים, 1 ישקע במים. */
  xapiAnswered('008', 'q1', ok, ok || s19Attempts >= S19.maxAttempts, { pairs: S19.order.filter(function (id) { return s19Placement[id] !== 'source'; }).map(function (id) { return { source: S19.order.indexOf(id), target: s19Placement[id] === 'float' ? 0 : 1 }; }) });
  s19Partial = okCount > 0 && !ok;
  if (ok) {
    s19Done = true;
    s19Outcome = 'correct';
    S19.order.forEach(function (id) { s19Marks[id] = 'correct'; });
    s19Render();
    s19ShowPopup('correct');
    s19Finish();
  } else if (s19Attempts >= S19.maxAttempts) {
    s19Done = true;
    s19Outcome = 'wrong2';
    s19Answer = Object.assign({}, s19Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s19View = 'solution';
    s19ApplyView();
    s19Finish();
  } else {
    s19LastWrong = s19Snapshot();
    /* חיווי per-כרטיס גם אחרי ניסיון ראשון (בקשת מפיק): מה נגרר נכון ומה לא; נמחק כשהלומד מתחיל לתקן */
    S19.order.forEach(function (id) { s19Marks[id] = (s19Placement[id] === S19.correct[id]) ? 'correct' : 'wrong'; });
    s19Render();
    s19ShowPopup('retry');
    const btn = document.getElementById('s19q-check');
    if (btn) btn.disabled = true; // Retry gate
    s19Say((s19Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'اقرأوا التلميح وحاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s19Finish() {
  const btn = document.getElementById('s19q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s19q-hint')?.classList.add('s8q-hint-done');
  s19CloseHint();
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s19ApplyView() {
  if (s19Answer === null) return;
  if (s19View === 'answer') {
    Object.assign(s19Placement, s19Answer);
    S19.order.forEach(function (id) { s19Marks[id] = (s19Placement[id] === S19.correct[id]) ? 'correct' : 'wrong'; });
  } else {
    Object.assign(s19Placement, S19.correct);
    S19.order.forEach(function (id) { s19Marks[id] = 'correct'; });
  }
  s19Render();
  s19ShowPopup('wrong2', s19View);
}
/* החלפת תצוגה (פתרון ↔ התשובה שלי): הפופאפ נשאר קבוע — רק הכפתור/התוכן מתחלפים, בלי אנימציית הופעה מחדש */
function holdOpenPopups() {
  document.querySelectorAll('.m-popup:not(.hidden)').forEach(function (el) { el.dataset.noReplay = '1'; });
}
function s19ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done / ניקוד
  if (s19Answer === null) return;
  s19View = (s19View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s19ApplyView();
}

function s19ShowPopup(type, view) {
  const cfg = S19_FEEDBACK[type];
  const popup = document.getElementById('s19q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  /* יעד 11: נכון על חלק מהפריטים (לא כולם) → "התשובה נכונה חלקית." במקום "לא נכונה" גורף; בשגוי סופי + "התשובה הנכונה מוצגת." */
  if (s19Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s19Partial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action; // הכפתור מתחלף
    title = title.split('<br>')[0]; // בתצוגת תשובת הלומד אין "התשובה הנכונה מוצגת." — הפתרון לא מוצג
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = ''; // re-anchor בכל פתיחה / החלפת תצוגה
  document.getElementById('s19q-popup-title').innerHTML = title;
  document.getElementById('s19q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s19q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s19ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState19() {
  s19InitDnd();
  document.getElementById('s19q-popup')?.classList.add('hidden');
  s19CloseHint();
  s19Selected = null;
  if (s19Done) {
    if (s19Outcome === 'wrong2') {
      s19View = 'solution';
      Object.assign(s19Placement, S19.correct);
      S19.order.forEach(function (id) { s19Marks[id] = 'correct'; });
    }
    s19Render();
    const btn = document.getElementById('s19q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s19q-hint')?.classList.add('s8q-hint-done');
    return;
  }
  s19Render();
}
function s19ReopenPopup() {
  if (s19Outcome === 'wrong2') { s19View = 'solution'; s19ApplyView(); }
  else if (s19Outcome) s19ShowPopup(s19Outcome);
}
function s19ClosePopups() {
  document.getElementById('s19q-popup')?.classList.add('hidden');
  s19CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s19OpenHint() {
  if (s19Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('008', 'q1');
  document.getElementById('s19q-hint-overlay')?.classList.remove('hidden');
}
function s19CloseHint() { document.getElementById('s19q-hint-overlay')?.classList.add('hidden'); }
function s19CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s19CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s19PopupDrag = null;
function s19PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s19q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s19PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s19PopupMove, { passive: false });
  document.addEventListener('pointerup', s19PopupUp);
  document.addEventListener('pointercancel', s19PopupUp);
  e.preventDefault();
}
function s19PopupMove(e) {
  if (!s19PopupDrag || e.pointerId !== s19PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s19PopupUp(e); return; }
  const popup = document.getElementById('s19q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s19PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s19PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s19PopupUp(e) {
  if (s19PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s19PopupDrag.id) return;
  s19PopupDrag = null;
  document.removeEventListener('pointermove', s19PopupMove);
  document.removeEventListener('pointerup', s19PopupUp);
  document.removeEventListener('pointercancel', s19PopupUp);
}


/* =========================================================
   מסך 27 (#s26) — שאלת גרירה: משוואת הצפיפות (שקף 38) — DragAndDropQuestion, וריאנט מקומי
   (אזור שחרור אחד לכל פריט). מפתח לפי הערת המפיקה: צפיפות = מסה : נפח → מונה = מסה, מכנה = נפח;
   "משקל" ו"זמן" הם מסיחים (נשארים במאגר גם בפתרון).
   • 2 ניסיונות (התסריט שותק → ברירת המחדל הקנונית); רמז זמין מההתחלה.
   • "צדקתי?" נפתח כששני האזורים מלאים (המסיחים לא חוסמים). Retry gate אחרי שגוי לא-סופי: כבוי עד
     שההנחה שונה בפועל מההנחה השגויה האחרונה (השוואה חיה של מצב ההנחה המלא).
   • הנחה על אזור תפוס — הדייר הקודם חוזר למאגר.
   • שגוי סופי: הפתרון מוצג מיד + View My Answer Toggle; חזרה (Back) למסך פתור — תמיד בתצוגת הפתרון.
   • מסלול חלופי בלי גרירה: הקשה/Enter על כרטיס בוחרת אותו, הקשה/Enter על אזור מניחה,
     הקשה על המאגר מחזירה כרטיס מונח.
   ========================================================= */
const S26 = {
  order: ['mass', 'volume', 'weight', 'time'],
  required: ['num', 'den'],
  correct: { num: 'mass', den: 'volume' },   // zone → card
  zoneName: { num: 'البسط', den: 'المقام' },
  maxAttempts: 2
};
const S26_EXPLAIN = [
  'الكثافة هي النسبة بين الكتلة والحجم لمادة ما:' +
    '<span class="s26-minifrac" aria-hidden="true"><span>الكتلة</span><span class="s26-minifrac__line"></span><span>الحجم</span></span>',
  'لكل مادة كثافة مميزة خاصة بها.'
];
const S26_FEEDBACK = {
  retry:   { bg: '#ffdbdc', title: 'الإجابة غير صحيحة.', body: ['اقرأوا التلميح وحاولوا مرة أخرى.'] },
  correct: { bg: '#f2ffe8', title: 'صحيح جدًا.', body: S26_EXPLAIN },
  wrong2:  {
    bg: '#ffdbdc', title: 'الإجابة غير صحيحة.<br>الإجابة الصحيحة معروضة.', body: S26_EXPLAIN,
    action: { label: 'الانتقال إلى إجابتي', view: 'answer' },
    answerView: { action: { label: 'الإجابة الصحيحة', view: 'solution' } } // כמו מסך 20: רק הכפתור מתחלף, המשוב נשאר מלא
  }
};

const s26Placement = {};      // cardId → 'source' | 'num' | 'den'
S26.order.forEach(function (id) { s26Placement[id] = 'source'; });
let s26Marks = {};            // cardId → 'correct' | 'wrong' (אחרי בדיקה בלבד)
let s26Selected = null;
let s26Attempts = 0;
let s26Done = false;          // נעילת החזרה-למסך (resume) + שער ההמשך
let s26Outcome = null;        // 'correct' | 'wrong2'
let s26LastWrong = null;
let s26Partial = false;       // אזור אחד נכון מתוך שניים → "התשובה נכונה חלקית."
let s26Answer = null;
let s26View = 'solution';
let s26Dnd = null;

function s26Snapshot() { return JSON.stringify(S26.order.map(function (id) { return s26Placement[id]; })); }
function s26ZoneCard(z) { return S26.order.find(function (id) { return s26Placement[id] === z; }) || null; }
function s26AllRequiredFilled() { return S26.required.every(function (z) { return s26ZoneCard(z) !== null; }); }
function s26Say(msg) { const el = document.getElementById('s26-live'); if (el) el.textContent = msg; }
function s26CardLabel(id) { return document.getElementById('s26-d-' + id).querySelector('.s26-card__text').textContent; }
function s26Place(id, zone) {   // הנחה עם פינוי הדייר הקודם
  const prev = s26ZoneCard(zone);
  if (prev && prev !== id) s26Placement[prev] = 'source';
  s26Placement[id] = zone;
  s26Say(s26CardLabel(id) + ' وُضِع في' + S26.zoneName[zone]);
}

function s26DismissRetry() {
  if (s26Done) return;
  s26Marks = {};
  document.getElementById('s26q-popup')?.classList.add('hidden');
}

function s26Render() {
  S26.order.forEach(function (id) {
    const src = document.getElementById('s26-d-' + id);
    src.classList.remove('dragging');
    src.classList.toggle('is-ghost', s26Placement[id] !== 'source');
    src.classList.toggle('is-locked', s26Done);
    const sel = s26Selected === id;
    src.classList.toggle('is-selected', sel && s26Placement[id] === 'source');
    src.setAttribute('aria-pressed', sel ? 'true' : 'false');
    src.setAttribute('aria-disabled', s26Done ? 'true' : 'false');
  });
  S26.required.forEach(function (z) {
    const zone = document.getElementById('s26-zone-' + z);
    zone.querySelectorAll('.s26-card').forEach(function (c) { c.remove(); });
    const id = s26ZoneCard(z);
    if (id) {
      const chip = document.createElement('div');
      chip.className = 's26-card is-placed';
      chip.dataset.id = id;
      chip.setAttribute('role', 'button');
      chip.tabIndex = 0;
      const icon = document.createElement('span');
      icon.className = 's26-card__icon';
      icon.setAttribute('aria-hidden', 'true');
      const text = document.createElement('span');
      text.className = 's26-card__text';
      text.textContent = s26CardLabel(id);
      chip.appendChild(icon);
      chip.appendChild(text);
      chip.classList.toggle('is-selected', s26Selected === id);
      chip.classList.toggle('is-locked', s26Done);
      chip.setAttribute('aria-pressed', s26Selected === id ? 'true' : 'false');
      chip.setAttribute('aria-label', s26CardLabel(id) + ' — ب' + S26.zoneName[z] +
        (s26Marks[id] === 'correct' ? '، صحيح' : s26Marks[id] === 'wrong' ? '، غير صحيح' : ''));
      if (s26Marks[id]) chip.classList.add(s26Marks[id] === 'correct' ? 'is-correct' : 'is-wrong');
      zone.appendChild(chip);
      if (!s26Done && s26Dnd) s26Dnd.attachSource(chip, id);
      chip.addEventListener('keydown', s26CardKey);
    }
    zone.classList.toggle('occupied', !!id);
    zone.classList.toggle('is-locked', s26Done);
  });
  s26UpdateCheck();
}

function s26UpdateCheck() {
  if (s26Done) return;
  const btn = document.getElementById('s26q-check');
  if (!btn) return;
  btn.disabled = !s26AllRequiredFilled() || (s26LastWrong !== null && s26Snapshot() === s26LastWrong); // Retry gate
}

function s26InitDnd() {
  if (s26Dnd) return;
  s26Dnd = createPointerDnd({
    canDrag: function () { return !s26Done; },
    onPick: function (id) {
      dndGhStop('s26', true);
      s26DismissRetry();
      s26Selected = null;
      if (s26Placement[id] !== 'source') s26Placement[id] = 'source';
      s26Render();
      document.getElementById('s26-d-' + id)?.classList.add('dragging');
    },
    onDrop: function (id, zone) { s26Place(id, zone); s26Render(); },
    onCancel: function () { s26Render(); },
    onTap: function (id) { s26Tap(id); }
  });
  S26.order.forEach(function (id) { s26Dnd.attachSource(document.getElementById('s26-d-' + id), id); });
  document.querySelectorAll('#s26 .s26-zone').forEach(function (z) { s26Dnd.attachTarget(z, z.dataset.zone); });
  document.querySelectorAll('#s26 .s26-card').forEach(function (c) { c.addEventListener('keydown', s26CardKey); });
}

function s26Tap(id) {
  if (s26Done) return;
  dndGhStop('s26', true);
  s26DismissRetry();
  /* יש כרטיס נבחר והלומד הקיש על כרטיס שכבר מונח באזור → הנחה על אותו אזור (מפנה את הדייר) */
  if (s26Selected && s26Selected !== id && s26Placement[id] !== 'source') {
    const moved = s26Selected;
    s26Selected = null;
    s26Place(moved, s26Placement[id]);
    s26Render();
    return;
  }
  s26Selected = (s26Selected === id) ? null : id;
  s26Say(s26Selected ? s26CardLabel(id) + ' تم الاختيار. اختاروا المنطقة: البسط أو المقام.' : '');
  s26Render();
}
function s26CardKey(e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s26Tap(e.currentTarget.dataset.id);
}
function s26ZoneClick(z, e) {
  if (e && e.target.closest && e.target.closest('.s26-card')) return; // הקשה על כרטיס מטופלת ב-s26Tap
  if (s26Done || !s26Selected) return;
  s26DismissRetry();
  const id = s26Selected;
  s26Selected = null;
  s26Place(id, z);
  s26Render();
}
function s26ZoneKey(e, z) {
  if (e.target !== e.currentTarget) return;
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  s26ZoneClick(z);
}
function s26TrayClick(e) {
  if (s26Done || !s26Selected || (e.target.closest && e.target.closest('.s26-card'))) return;
  if (s26Placement[s26Selected] === 'source') return;
  s26DismissRetry();
  s26Placement[s26Selected] = 'source';
  s26Say(s26CardLabel(s26Selected) + ' تمت الإعادة إلى المخزن');
  s26Selected = null;
  s26Render();
}

function s26Check() {
  if (s26Done) { advanceScreen(); return; }
  if (!s26AllRequiredFilled()) return;
  s26Selected = null;
  s26Attempts++;
  document.getElementById('s26q-hint')?.classList.add('hint-on'); /* רמז מופיע רק אחרי ניסיון ראשון */
  const okCount = S26.required.filter(function (z) { return s26ZoneCard(z) === S26.correct[z]; }).length;
  const ok = okCount === S26.required.length;
  /* xAPI: matching — the card in each zone; target index per the catalogue (0 המונה, 1 המכנה). */
  xapiAnswered('011', 'q1', ok, ok || s26Attempts >= S26.maxAttempts, { pairs: S26.required.map(function (z) { var id = s26ZoneCard(z); return id ? { source: s26CardLabel(id), target: z === 'num' ? 0 : 1 } : null; }).filter(Boolean) });
  s26Partial = okCount > 0 && !ok;
  if (ok) {
    s26Done = true;
    s26Outcome = 'correct';
    S26.required.forEach(function (z) { s26Marks[s26ZoneCard(z)] = 'correct'; });
    s26Render();
    s26ShowPopup('correct');
    s26Finish();
  } else if (s26Attempts >= S26.maxAttempts) {
    s26Done = true;
    s26Outcome = 'wrong2';
    s26Answer = Object.assign({}, s26Placement); // צילום לפני שהחשיפה דורסת את ההנחה
    s26View = 'solution';
    s26ApplyView();
    s26Finish();
  } else {
    s26LastWrong = s26Snapshot();
    S26.required.forEach(function (z) { const id = s26ZoneCard(z); s26Marks[id] = (id === S26.correct[z]) ? 'correct' : 'wrong'; });
    s26Render();
    s26ShowPopup('retry');
    const btn = document.getElementById('s26q-check');
    if (btn) btn.disabled = true; // Retry gate
    s26Say((s26Partial ? 'الإجابة صحيحة جزئيًا. ' : 'الإجابة غير صحيحة. ') + 'اقرأوا التلميح وحاولوا مرة أخرى.');
  }
  try { flushResumeSave(); } catch (e) {}   /* resume: committed (D-13) */
}

function s26Finish() {
  const btn = document.getElementById('s26q-check');
  if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; } /* אין תווית-המשך בתסריט → ברירת-המחדל הקנונית */
  document.getElementById('s26q-hint')?.classList.add('s8q-hint-done');
  s26CloseHint();
}

/* חשיפת הפתרון: מונה/מכנה מקבלים את הפריטים הנכונים; המסיחים חוזרים למאגר */
function s26RevealSolution() {
  S26.order.forEach(function (id) { s26Placement[id] = 'source'; });
  S26.required.forEach(function (z) { s26Placement[S26.correct[z]] = z; s26Marks[S26.correct[z]] = 'correct'; });
}

/* הבעלים היחיד של מצב "שגוי סופי": פתרון / התשובה שלי */
function s26ApplyView() {
  if (s26Answer === null) return;
  s26Marks = {};
  if (s26View === 'answer') {
    Object.assign(s26Placement, s26Answer);
    S26.required.forEach(function (z) { const id = s26ZoneCard(z); s26Marks[id] = (id === S26.correct[z]) ? 'correct' : 'wrong'; });
  } else {
    s26RevealSolution();
  }
  s26Render();
  s26ShowPopup('wrong2', s26View);
}
function s26ToggleView() { // החלפת תצוגה בלבד — לא נוגע בניסיונות / done
  if (s26Answer === null) return;
  s26View = (s26View === 'solution') ? 'answer' : 'solution';
  holdOpenPopups();
  s26ApplyView();
}

function s26ShowPopup(type, view) {
  const cfg = S26_FEEDBACK[type];
  const popup = document.getElementById('s26q-popup');
  if (!popup || !cfg) return;
  let title = cfg.title, body = cfg.body, action = cfg.action || null;
  if (s26Partial && type === 'retry') title = 'الإجابة صحيحة جزئيًا.';
  if (s26Partial && type === 'wrong2') title = 'الإجابة صحيحة جزئيًا.<br>تُعرَض الإجابة الصحيحة.';
  if (type === 'wrong2' && view === 'answer') {
    action = cfg.answerView.action;
    title = title.split('<br>')[0]; // בתצוגת תשובת הלומד הפתרון לא מוצג
  }
  popup.style.background = cfg.bg;
  popup.style.left = ''; popup.style.top = ''; popup.style.bottom = '';
  document.getElementById('s26q-popup-title').innerHTML = title;
  document.getElementById('s26q-popup-body').innerHTML = body.map(function (p) { return '<p>' + p + '</p>'; }).join('');
  const box = document.getElementById('s26q-popup-actions');
  box.innerHTML = '';
  if (action) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'popup-action';
    b.textContent = action.label;
    b.addEventListener('click', s26ToggleView);
    box.appendChild(b);
  }
  popup.classList.remove('hidden');
}

/* כניסה למסך: מסך פתור חוזר נעול (תצוגת הפתרון); לא פתור — המצב נשמר כמו שהוא */
function resetScreenState26() {
  s26InitDnd();
  document.getElementById('s26q-popup')?.classList.add('hidden');
  s26CloseHint();
  s26Selected = null;
  if (s26Done) {
    if (s26Outcome === 'wrong2') { s26View = 'solution'; s26RevealSolution(); }
    s26Render();
    const btn = document.getElementById('s26q-check');
    if (btn) { btn.disabled = false; btn.textContent = 'متابعة'; }
    document.getElementById('s26q-hint')?.classList.add('s8q-hint-done');
    return;
  }
  s26Render();
}
function s26ReopenPopup() {
  if (s26Outcome === 'wrong2') { s26View = 'solution'; s26ApplyView(); }
  else if (s26Outcome) s26ShowPopup(s26Outcome);
}
function s26ClosePopups() {
  document.getElementById('s26q-popup')?.classList.add('hidden');
  s26CloseHint();
}

/* רמז: זמין מההתחלה, ניתן לפתיחה חוזרת; סגירה — כפתור / לחיצה בחוץ / Escape */
function s26OpenHint() {
  if (s26Done) return;
  /* xAPI: requested.1 — after the guard, immediately before the reveal (open only, not a toggle). */
  xapiRequestedHint('011', 'q1');
  document.getElementById('s26q-hint-overlay')?.classList.remove('hidden');
}
function s26CloseHint() { document.getElementById('s26q-hint-overlay')?.classList.add('hidden'); }
function s26CloseHintOnBackdrop(e) { if (e.target === e.currentTarget) s26CloseHint(); }

/* גרירת פופאפ-המשוב — Pointer Events, בגבולות הקנבס ומעל סרגל-הניווט (74px) */
let s26PopupDrag = null;
function s26PopupDown(e) {
  if (e.target.closest && e.target.closest('.popup-action')) return;
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const popup = document.getElementById('s26q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const left = popup.offsetLeft, top = popup.offsetTop;
  popup.style.left = left + 'px';
  popup.style.top = top + 'px';
  popup.style.bottom = 'auto';
  s26PopupDrag = { id: e.pointerId, offX: (e.clientX - rect.left) / scale - left, offY: (e.clientY - rect.top) / scale - top };
  document.addEventListener('pointermove', s26PopupMove, { passive: false });
  document.addEventListener('pointerup', s26PopupUp);
  document.addEventListener('pointercancel', s26PopupUp);
  e.preventDefault();
}
function s26PopupMove(e) {
  if (!s26PopupDrag || e.pointerId !== s26PopupDrag.id) return;
  if (e.pointerType === 'mouse' && e.buttons === 0) { s26PopupUp(e); return; }
  const popup = document.getElementById('s26q-popup');
  const app = document.getElementById('app');
  if (!popup || !app) return;
  const rect = app.getBoundingClientRect();
  const scale = getAppScale();
  const canvas = getCanvasSize();
  const nx = (e.clientX - rect.left) / scale - s26PopupDrag.offX;
  const ny = (e.clientY - rect.top) / scale - s26PopupDrag.offY;
  popup.style.left = Math.max(0, Math.min(nx, canvas.w - popup.offsetWidth)) + 'px';
  popup.style.top = Math.max(0, Math.min(ny, canvas.h - 74 - popup.offsetHeight)) + 'px';
  e.preventDefault();
}
function s26PopupUp(e) {
  if (s26PopupDrag && e && e.pointerId !== undefined && e.pointerId !== s26PopupDrag.id) return;
  s26PopupDrag = null;
  document.removeEventListener('pointermove', s26PopupMove);
  document.removeEventListener('pointerup', s26PopupUp);
  document.removeEventListener('pointercancel', s26PopupUp);
}


/* =========================================================
   מסך 22 — כרטיסיות מתהפכות: מטבע / סירה (FlipCardsReveal, חד-כיווני)
   720-templates → FlipCardsReveal.md: unlock = seen-at-least-once לכל
   הכרטיסיות; הפיכה חד-כיוונית. אחרי ההפיכה האחרונה עולה הדמות עם הבועה
   (שקף 32). מצב נשמר בין כניסות — הכרטיסיות נשארות הפוכות, ההמשך פעיל.
   ========================================================= */
let s21Revealed = [false, false];

function s21AllRevealed() {
  return s21Revealed.every(Boolean);
}

function s21Flip(cardEl) {
  /* דו-כיווני (הנחיית מפיקה) — s21Revealed הוא seen-at-least-once (חד-כיווני, נועל את ה-unlock) */
  const on = !cardEl.classList.contains('is-flipped');
  cardEl.classList.toggle('is-flipped', on);
  cardEl.setAttribute('aria-expanded', on ? 'true' : 'false');
  cardEl.querySelector('.frc-card-front').setAttribute('aria-hidden', on ? 'true' : 'false');
  cardEl.querySelector('.frc-card-back').setAttribute('aria-hidden', on ? 'false' : 'true');
  frcGhStop('s21', true);
  s21Revealed[Number(cardEl.dataset.index)] = true;
  s21Sync(true);
}

/* מסנכרן את "המשך" והדמות למצב ה-flip. animate=true רק ברגע ההפיכה האחרונה. */
function s21Sync(animate) {
  const screen = document.getElementById('s21');
  const wrap = document.getElementById('s21-char-wrap');
  const all = s21AllRevealed();
  document.getElementById('s21-next').disabled = !all;
  if (!all) return;
  /* הסרטון הדקורטיבי רץ בלופ כל עוד המסך פעיל (נעצר ב-goTo ביציאה) */
  const p = document.getElementById('s21-char-video').play();
  if (p && p.catch) p.catch(function () {});
  if (screen.classList.contains('s21-char-on')) return;
  screen.classList.add('s21-char-on');
  if (animate && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    wrap.classList.add('is-animating');
    wrap.addEventListener('animationend', function () { wrap.classList.remove('is-animating'); }, { once: true });
  }
}

/* =========================================================
   מסך 23 (#s22) — TransitionScreen (שקף 33). וידאו דקורטיבי בלולאה (החלטת
   המשתמש; נעצר ב-goTo ביציאה ומתחדש בכניסה). Continue פעיל תמיד (אין גייט).
   ========================================================= */
function resetScreenState22() {
  playS22Video();
}
function playS22Video() {
  const vid = document.getElementById('s22-char-video');
  if (vid && vid.paused) vid.play().catch(function () {});
}


/* =========================================================
   מסך 25 (#s24) — TransitionScreen (שקף 36), זהה למסך 23: וידאו דקורטיבי בלולאה,
   Continue פעיל תמיד.
   ========================================================= */
function playS24Video() {
  const vid = document.getElementById('s24-char-video');
  if (vid && vid.paused) vid.play().catch(function () {});
}

/* =========================================================
   מסך 26 (#s25) — TransitionScreen (שקף 37). וידאו דקורטיבי שמתנגן פעם אחת
   ונשאר על הפריים האחרון; יציאה באמצע ההפעלה → חזרה ממשיכה מאותה נקודה
   (לא מאפסים). Continue פעיל תמיד.
   ========================================================= */
function playS25Video() {
  const vid = document.getElementById('s25-char-video');
  if (vid && vid.paused && !vid.ended) vid.play().catch(function () {});
}

/* =========================================================
   מסך 24 — כרטיסיות מתהפכות: גזים ותכונת הצפיפות (FlipCardsReveal,
   חד-כיווני, 3 כרטיסיות). אותה מכניקה כמו מסך 22, בלי דמות.
   ========================================================= */
let s23Revealed = [false, false, false];

function s23Flip(cardEl) {
  const on = !cardEl.classList.contains('is-flipped'); // דו-כיווני (הנחיית מפיקה)
  cardEl.classList.toggle('is-flipped', on);
  cardEl.setAttribute('aria-expanded', on ? 'true' : 'false');
  cardEl.querySelector('.frc-card-front').setAttribute('aria-hidden', on ? 'true' : 'false');
  cardEl.querySelector('.frc-card-back').setAttribute('aria-hidden', on ? 'false' : 'true');
  frcGhStop('s23', true);
  s23Revealed[Number(cardEl.dataset.index)] = true;
  s23Sync();
}

function s23Sync() {
  document.getElementById('s23-next').disabled = !s23Revealed.every(Boolean);
}


/* ---------- מחוות-יד (Cursor Click) למסכי פליפ-קארדז 22/24 ----------
   אותו נכס/אנימציה כמו מסך 3 (s2Gh*), גרסה כללית לפי מזהה-מסך. 720-templates →
   _gesture-hints.md: עוגן מהגיאומטריה האמיתית של הכרטיס, persistent עד שהלומד
   לוחץ על כרטיסייה כלשהי ("gesture understood" — נעצרת לצמיתות למסך), מכבד
   prefers-reduced-motion. מתחילה אחרי שהמסך פעיל ואנימציית-הכניסה הסתיימה. */
const frcGhState = { s21: { token: 0, understood: false }, s23: { token: 0, understood: false } };

function frcGhStart(id) {
  const st = frcGhState[id];
  if (st.understood) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const token = ++st.token;
  setTimeout(function () {
    if (token !== st.token || st.understood) return;
    const gh = document.getElementById(id + '-gh');
    const grid = document.getElementById(id + '-cards');
    const first = grid && grid.querySelector('.frc-card:not(.is-flipped)');
    if (!gh || !first) return;
    const gridRect = grid.getBoundingClientRect();
    const cardRect = first.getBoundingClientRect();
    const scale = gridRect.width ? (grid.offsetWidth / gridRect.width) : 1; // תיקון ל-scaleApp()
    let cx = (cardRect.left - gridRect.left) * scale + (cardRect.width * scale) / 2;
    let cy = (cardRect.top - gridRect.top) * scale + (cardRect.height * scale) / 2;
    if (id === 's21' || id === 's23') { /* מסכים 22 ו-24: המחווה בפינה הימנית-עליונה של הכרטיסייה (ולא במרכז, מעל התמונה) */
      cx = (cardRect.right - gridRect.left) * scale - 24;
      cy = (cardRect.top - gridRect.top) * scale + 10;
    }
    gh.style.left = (cx - gh.offsetWidth / 2) + 'px';
    gh.style.top = (cy - gh.offsetHeight / 2) + 'px';
    gh.classList.remove('hidden');
  }, 800);
}

function frcGhStop(id, understood) {
  const st = frcGhState[id];
  st.token++;
  if (understood) st.understood = true;
  document.getElementById(id + '-gh')?.classList.add('hidden');
}


/* ---------- מחוות-יד (גרירה) לשאלות הגרירה — מסכים 20 (#s19) ו-27 (#s26) ----------
   720-templates → _gesture-hints.md → "Drag-specific rules": שתי נקודות-עוגן אמיתיות (כרטיס מקור
   ואזור יעד) מהגיאומטריה החיה, מתוקנות ל-scale של scaleApp(); היד נראית נעה רק בכיוון המלמד
   (מהכרטיס אל האזור) — חוזרת להתחלה רק אחרי שדהתה לגמרי. שרשרת-שלבים בבעלות JS עם token לביטול
   קריאות ישנות; persistent עד שהלומד מתחיל בפועל אינטראקציה עם **כל** כרטיס (גרירה / הקשה /
   מקלדת → "gesture understood", עצמאי משאר מצב המסך). מכבד prefers-reduced-motion.
   הדגמה דקורטיבית בלבד: זוג כרטיס→אזור הוא חלק מהאנימציה, לא מפתח תשובה. */
const DND_GH = {
  s19: { stage: '#s19 .s19-stage', card: 's19-d-ice', zone: 's19-zone-float', done: function () { return s19Done; } },
  s26: { stage: '#s26 .s26-stage', card: 's26-d-mass', zone: 's26-zone-num', done: function () { return s26Done; } }
};
const dndGhState = { s19: { token: 0, understood: false }, s26: { token: 0, understood: false } };

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
    put(a);                                  // איפוס מיקום — היד שקופה כרגע
    void gh.offsetWidth;
    later(function () {
      gh.classList.add('is-on', 'is-click'); // שלב 1: הופעה + לחיצה על הכרטיס
      later(function () {
        gh.classList.remove('is-click');
        void gh.offsetWidth;
        gh.classList.add('is-moving');       // שלב 2: גרירה אל האזור (קדימה בלבד)
        put(b);
        later(function () {                  // שלב 3: עמידה ביעד, ואז דהייה במקום
          gh.classList.remove('is-on');
          later(function () {                // שלב 4: שקופה לגמרי → חוזרים להתחלה (איפוס בתחילת cycle)
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


/* סאונד לווידאו הפותח (לפי הנחיית התסריט): מנסים לנגן עם קול; אם הדפדפן חוסם
   autoplay עם קול — מנגנים מושתק ומפעילים קול בלחיצה הראשונה של הלומד. */
(function () {
  var v = document.getElementById('s0-video');
  if (!v) return;
  var btn = document.getElementById('s0-sound');
  function syncSoundBtn() {
    if (!btn) return;
    var on = !v.muted;
    btn.classList.toggle('is-on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.setAttribute('aria-label', on ? 'كتم الصوت' : 'تشغيل الصوت');
  }
  v.addEventListener('volumechange', syncSoundBtn);
  if (btn) btn.addEventListener('click', function () {
    v.muted = !v.muted;
    if (!v.muted) v.play().catch(function () {});
  });
  syncSoundBtn();
  /* עצירה/הפעלה: הסרטון מנגן פעם אחת ונעצר; כפתור ההפעלה מאפשר צפייה חוזרת */
  var pbtn = document.getElementById('s0-play');
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
  var p = v.play();
  if (p && p.catch) p.catch(function () {
    v.muted = true;
    v.play().catch(function () {});
    function unmute(e) {
      /* לחיצה על כפתור הקול עצמו מטופלת ב-click שלו — אחרת הוא יחזיר להשתקה מיד */
      if (btn && e && e.target && btn.contains(e.target)) return;
      /* רק כשהמסך של הווידאו פעיל — אחרת לחיצה במסך אחר הייתה מפעילה את הסאונד שלו */
      if (currentScreen !== 0) return;
      v.muted = false;
      v.play().catch(function () {});
      document.removeEventListener('pointerdown', unmute);
      document.removeEventListener('keydown', unmute);
    }
    document.addEventListener('pointerdown', unmute);
    document.addEventListener('keydown', unmute);
  });
})();

/* מניעת גרירה-ושחרור "מקורית" של הדפדפן (בקשת לקוחה): גרירת כרטיסייה/תמונה לתוך שדה קלט גרמה להופעת קישור (כתובת התמונה) בשדה.
   אין בלומדה גרירה מקורית (HTML5 DnD) — כל הגרירות הן Pointer Events — לכן חוסמים אותה גלובלית:
   (1) תמונות/קישורים/כפתורים לא ניתנים לגרירה; (2) שחרור כלשהו מגרירה מקורית לא מוסיף תוכן לשדות. */
document.addEventListener('dragstart', function (e) {
  if (e.target && e.target.closest && e.target.closest('img, a, button, [role="button"]')) e.preventDefault();
});
document.addEventListener('drop', function (e) { e.preventDefault(); });


/* ═══════════════════ xAPI (720) — קונפיגורציה של הסין ═══════════════════
   נתונים בלבד, נקראים בזמן call על ידי ../unit-js/ (guide §6.1). SCREEN_TO_SUBCONTENT מחזיק
   בדיוק TOTAL_SCREENS מפתחות (28) — מפתח חסר = מסך שלא מדווח, בשקט; _test/verify-report.js
   אוכף זאת. Value[0] = סיומת הפריט (מחרוזת 3 ספרות), value[1] = עמוד-בפריט (תיעוד בלבד).
   מסכי מעבר/נרטיב ממופים לפריט שהם שייכים לו (D-2: כל פריט בקטלוג מקבל מסך). מקור:
   docs-and-tools/REPORT-XAPI.md (catalogue map). */
var SCREEN_TO_SUBCONTENT = {
  0: ['001', 1],
  1: ['001', 2],
  2: ['002', 1],
  3: ['002', 2],
  4: ['003', 1],
  5: ['003', 2],
  6: ['003', 3],
  7: ['003', 4],
  8: ['004', 1],
  9: ['005', 1],
  10: ['005', 2],
  11: ['005', 3],
  12: ['005', 4],
  13: ['005', 5],
  14: ['005', 6],
  15: ['006', 1],
  16: ['007', 1],
  17: ['007', 2],
  18: ['007', 3],
  19: ['008', 1],
  20: ['009', 1],
  21: ['009', 2],
  22: ['010', 1],
  23: ['010', 2],
  24: ['011', 1],
  25: ['011', 2],
  26: ['011', 3],
  27: ['012', 1]
};

var XAPI_COMP_SLUG = 'methodica-science-mass-density-01-01';
var XAPI_COMP_ID   = XAPI_ID_PREFIX + XAPI_COMP_SLUG + '/';
var XAPI_EVAL_ITEMS = { '002': 1, '004': 1, '006': 1, '008': 1, '011': 1, '012': 1 };   /* items whose question is graded in CODE (xapiAnswered call sites) */
var XAPI_METADATA_FILE = '../metadata/methodica-science-mass-density-01-01.json';
var XAPI_END_BTN = 's27q-check';                               /* the part's last button (D-8, restoreEndedButton) */
var XAPI_PART_QUESTIONS = ['002/q1', '002/q2', '004/q1', '006/q1', '008/q1', '011/q1', '012/q1'];   /* '<item>/<q>' keys this part reports — the denominator of the part result */
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
  if (DEV_NAV) window.location.href = '../methodica-science-mass-density-01-02/index.html' + window.location.search;
}

/* ═══════════════════ RESUME — ארבעת ה-hooks הפר-סיניים (guide §8.7) ═══════════════════
   חיים כאן ולא בשכבה המשותפת כי מצב הלומד מוצהר let/const ברמת top-level ואינו נגיש דרך window.
   שלב א' (2026-11-02): currentScreen + XAPI_Q_RESULTS. שלב ב' (2026-11-02): every per-screen state
   variable (60 in this part, listed by the generator from the top-level let/const declarations,
   transient ones — pointer DnD instances, timers, popup drags — excluded), the DOM-only values (typed
   inputs, dropdown texts) and one painter per interactive screen (§8.8 rules 1–12).
   screens 5 (sequence), 6/7 (highlights), 10/11 (axes), 16–18/20 (applet gates) repaint themselves from the restored variables in resetScreenState; 13/14 (graph building) restore their gate flags only
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
      frcRevealed: _rsPack(frcRevealed),
      frcFlipped: _rsPack(frcFlipped),
      s2TableAttempts: _rsPack(s2TableAttempts),
      s2TableDone: _rsPack(s2TableDone),
      s2TableLastSignature: _rsPack(s2TableLastSignature),
      s2TableAnswer: _rsPack(s2TableAnswer),
      s2TableView: _rsPack(s2TableView),
      s2TableOutcome: _rsPack(s2TableOutcome),
      s2TablePartial: _rsPack(s2TablePartial),
      s3qSelected: _rsPack(s3qSelected),
      s3qAttempts: _rsPack(s3qAttempts),
      s3qDone: _rsPack(s3qDone),
      s3qLastWrong: _rsPack(s3qLastWrong),
      s3qLastOutcome: _rsPack(s3qLastOutcome),
      s5SeqDone: _rsPack(s5SeqDone),
      hlSeen: _rsPack(hlSeen),
      s8qSelected: _rsPack(s8qSelected),
      s8qAttempts: _rsPack(s8qAttempts),
      s8qDone: _rsPack(s8qDone),
      s8qLastWrong: _rsPack(s8qLastWrong),
      s8qLastOutcome: _rsPack(s8qLastOutcome),
      axState: _rsPack(axState),
      s13State: _rsPack(s13State),
      s14State: _rsPack(s14State),
      s15qSelected: _rsPack(s15qSelected),
      s15qAttempts: _rsPack(s15qAttempts),
      s15qDone: _rsPack(s15qDone),
      s15qLastWrong: _rsPack(s15qLastWrong),
      s15qLastOutcome: _rsPack(s15qLastOutcome),
      s27qSelected: _rsPack(s27qSelected),
      s27qAttempts: _rsPack(s27qAttempts),
      s27qDone: _rsPack(s27qDone),
      s27qLastWrong: _rsPack(s27qLastWrong),
      s27qLastOutcome: _rsPack(s27qLastOutcome),
      s16Attempted: _rsPack(s16Attempted),
      s20Attempted: _rsPack(s20Attempted),
      s17Done: _rsPack(s17Done),
      s18Done: _rsPack(s18Done),
      s19Placement: _rsPack(s19Placement),
      s19Marks: _rsPack(s19Marks),
      s19Selected: _rsPack(s19Selected),
      s19Attempts: _rsPack(s19Attempts),
      s19Done: _rsPack(s19Done),
      s19Outcome: _rsPack(s19Outcome),
      s19LastWrong: _rsPack(s19LastWrong),
      s19Partial: _rsPack(s19Partial),
      s19Answer: _rsPack(s19Answer),
      s19View: _rsPack(s19View),
      s26Placement: _rsPack(s26Placement),
      s26Marks: _rsPack(s26Marks),
      s26Selected: _rsPack(s26Selected),
      s26Attempts: _rsPack(s26Attempts),
      s26Done: _rsPack(s26Done),
      s26Outcome: _rsPack(s26Outcome),
      s26LastWrong: _rsPack(s26LastWrong),
      s26Partial: _rsPack(s26Partial),
      s26Answer: _rsPack(s26Answer),
      s26View: _rsPack(s26View),
      s21Revealed: _rsPack(s21Revealed),
      s23Revealed: _rsPack(s23Revealed)
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
  if (has('frcRevealed')) frcRevealed = _rsUnpack(v.frcRevealed);
  if (has('frcFlipped')) frcFlipped = _rsUnpack(v.frcFlipped);
  if (has('s2TableAttempts')) s2TableAttempts = _rsUnpack(v.s2TableAttempts);
  if (has('s2TableDone')) s2TableDone = _rsUnpack(v.s2TableDone);
  if (has('s2TableLastSignature')) s2TableLastSignature = _rsUnpack(v.s2TableLastSignature);
  if (has('s2TableAnswer')) s2TableAnswer = _rsUnpack(v.s2TableAnswer);
  if (has('s2TableView')) s2TableView = _rsUnpack(v.s2TableView);
  if (has('s2TableOutcome')) s2TableOutcome = _rsUnpack(v.s2TableOutcome);
  if (has('s2TablePartial')) s2TablePartial = _rsUnpack(v.s2TablePartial);
  if (has('s3qSelected')) s3qSelected = _rsUnpack(v.s3qSelected);
  if (has('s3qAttempts')) s3qAttempts = _rsUnpack(v.s3qAttempts);
  if (has('s3qDone')) s3qDone = _rsUnpack(v.s3qDone);
  if (has('s3qLastWrong')) s3qLastWrong = _rsUnpack(v.s3qLastWrong);
  if (has('s3qLastOutcome')) s3qLastOutcome = _rsUnpack(v.s3qLastOutcome);
  if (has('s5SeqDone')) s5SeqDone = _rsUnpack(v.s5SeqDone);
  if (has('s8qSelected')) s8qSelected = _rsUnpack(v.s8qSelected);
  if (has('s8qAttempts')) s8qAttempts = _rsUnpack(v.s8qAttempts);
  if (has('s8qDone')) s8qDone = _rsUnpack(v.s8qDone);
  if (has('s8qLastWrong')) s8qLastWrong = _rsUnpack(v.s8qLastWrong);
  if (has('s8qLastOutcome')) s8qLastOutcome = _rsUnpack(v.s8qLastOutcome);
  if (has('s15qSelected')) s15qSelected = _rsUnpack(v.s15qSelected);
  if (has('s15qAttempts')) s15qAttempts = _rsUnpack(v.s15qAttempts);
  if (has('s15qDone')) s15qDone = _rsUnpack(v.s15qDone);
  if (has('s15qLastWrong')) s15qLastWrong = _rsUnpack(v.s15qLastWrong);
  if (has('s15qLastOutcome')) s15qLastOutcome = _rsUnpack(v.s15qLastOutcome);
  if (has('s27qSelected')) s27qSelected = _rsUnpack(v.s27qSelected);
  if (has('s27qAttempts')) s27qAttempts = _rsUnpack(v.s27qAttempts);
  if (has('s27qDone')) s27qDone = _rsUnpack(v.s27qDone);
  if (has('s27qLastWrong')) s27qLastWrong = _rsUnpack(v.s27qLastWrong);
  if (has('s27qLastOutcome')) s27qLastOutcome = _rsUnpack(v.s27qLastOutcome);
  if (has('s16Attempted')) s16Attempted = _rsUnpack(v.s16Attempted);
  if (has('s20Attempted')) s20Attempted = _rsUnpack(v.s20Attempted);
  if (has('s17Done')) s17Done = _rsUnpack(v.s17Done);
  if (has('s18Done')) s18Done = _rsUnpack(v.s18Done);
  if (has('s19Marks')) s19Marks = _rsUnpack(v.s19Marks);
  if (has('s19Selected')) s19Selected = _rsUnpack(v.s19Selected);
  if (has('s19Attempts')) s19Attempts = _rsUnpack(v.s19Attempts);
  if (has('s19Done')) s19Done = _rsUnpack(v.s19Done);
  if (has('s19Outcome')) s19Outcome = _rsUnpack(v.s19Outcome);
  if (has('s19LastWrong')) s19LastWrong = _rsUnpack(v.s19LastWrong);
  if (has('s19Partial')) s19Partial = _rsUnpack(v.s19Partial);
  if (has('s19Answer')) s19Answer = _rsUnpack(v.s19Answer);
  if (has('s19View')) s19View = _rsUnpack(v.s19View);
  if (has('s26Marks')) s26Marks = _rsUnpack(v.s26Marks);
  if (has('s26Selected')) s26Selected = _rsUnpack(v.s26Selected);
  if (has('s26Attempts')) s26Attempts = _rsUnpack(v.s26Attempts);
  if (has('s26Done')) s26Done = _rsUnpack(v.s26Done);
  if (has('s26Outcome')) s26Outcome = _rsUnpack(v.s26Outcome);
  if (has('s26LastWrong')) s26LastWrong = _rsUnpack(v.s26LastWrong);
  if (has('s26Partial')) s26Partial = _rsUnpack(v.s26Partial);
  if (has('s26Answer')) s26Answer = _rsUnpack(v.s26Answer);
  if (has('s26View')) s26View = _rsUnpack(v.s26View);
  if (has('s21Revealed')) s21Revealed = _rsUnpack(v.s21Revealed);
  if (has('s23Revealed')) s23Revealed = _rsUnpack(v.s23Revealed);
  if (has('hlSeen') && v.hlSeen && typeof v.hlSeen === 'object') _rsAssign(hlSeen, _rsUnpack(v.hlSeen));
  if (has('axState') && v.axState && typeof v.axState === 'object') _rsAssign(axState, _rsUnpack(v.axState));
  if (has('s13State') && v.s13State && typeof v.s13State === 'object') _rsAssign(s13State, _rsUnpack(v.s13State));
  if (has('s14State') && v.s14State && typeof v.s14State === 'object') _rsAssign(s14State, _rsUnpack(v.s14State));
  if (has('s19Placement') && v.s19Placement && typeof v.s19Placement === 'object') _rsAssign(s19Placement, _rsUnpack(v.s19Placement));
  if (has('s26Placement') && v.s26Placement && typeof v.s26Placement === 'object') _rsAssign(s26Placement, _rsUnpack(v.s26Placement));
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
    case 2: /* cubes table — flips and the solved view come from resetScreenState2; the typed values from applyResumeDom */
      if (s2TableDone) { var rp2 = rsFn('s2tReopenPopup'); if (rp2) rp2(); } else s2UpdateContinueBtn(); break;
    case 3: rsPaintScq({ sel: s3qSelected, done: s3qDone, lw: s3qLastWrong, att: s3qAttempts, out: s3qLastOutcome, correct: S3Q.correctId,
      mark: s3qMark, finish: s3qFinish, select: rsFn('s3qSelect'), showPopup: rsFn('s3qShowPopup'), reopen: rsFn('s3qReopenPopup'),
      hint: 's3q-hint', check: 's3q-check' }); break;
    case 8: rsPaintScq({ sel: s8qSelected, done: s8qDone, lw: s8qLastWrong, att: s8qAttempts, out: s8qLastOutcome, correct: S8Q.correctId,
      mark: s8qMark, finish: s8qFinish, select: rsFn('s8qSelect'), showPopup: rsFn('s8qShowPopup'), reopen: rsFn('s8qReopenPopup'),
      hint: 's8q-hint', check: 's8q-check' }); break;
    case 15: rsPaintScq({ sel: s15qSelected, done: s15qDone, lw: s15qLastWrong, att: s15qAttempts, out: s15qLastOutcome, correct: S15Q.correctId,
      mark: s15qMark, finish: s15qFinish, select: rsFn('s15qSelect'), showPopup: rsFn('s15qShowPopup'), reopen: rsFn('s15qReopenPopup'),
      hint: 's15q-hint', check: 's15q-check' }); break;
    case 19: rsPaintDnd({ done: s19Done, att: s19Attempts, lw: s19LastWrong, out: s19Outcome, render: rsFn('s19Render'), snap: rsFn('s19Snapshot'),
      update: rsFn('s19UpdateCheck'), showPopup: rsFn('s19ShowPopup'), reopen: rsFn('s19ReopenPopup'), hint: 's19q-hint' }); break;
    case 26: rsPaintDnd({ done: s26Done, att: s26Attempts, lw: s26LastWrong, out: s26Outcome, render: rsFn('s26Render'), snap: rsFn('s26Snapshot'),
      update: rsFn('s26UpdateCheck'), showPopup: rsFn('s26ShowPopup'), reopen: rsFn('s26ReopenPopup'), hint: 's26q-hint' }); break;
    case 27: rsPaintScq({ sel: s27qSelected, done: s27qDone, lw: s27qLastWrong, att: s27qAttempts, out: s27qLastOutcome, correct: S27Q.correctId,
      mark: s27qMark, finish: s27qFinish, select: rsFn('s27qSelect'), showPopup: rsFn('s27qShowPopup'), reopen: rsFn('s27qReopenPopup'),
      hint: 's27q-hint', check: 's27q-check' }); break;
      default: break;   /* transition / narrative screens: nothing to paint beyond resetScreenState */
    }
  } catch (e) { console.error('[resume] paint screen ' + n, e); }
}

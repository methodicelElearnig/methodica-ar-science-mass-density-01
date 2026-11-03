/* =========================================================
   יישומון גרירה — מסך 17 (שקף 26): כוס מים + קוביית ברזל / עץ אורן.
   נטמע ב-#s16-applet (index.html). עצמאי: בונה את ה-DOM בעצמו.
   הנחיות מפיקה (הערות שקף 26):
   - גוררים כל קוביה לריבוע "גררו לכאן ושחררו"; ברגע השחרור רואים אם
     הקוביה שוקעת או צפה (ברזל — שוקע, עץ אורן — צפה).
   - הכיתוב עם ערך הצפיפות נשאר על הקוביות תמיד.
   - אחרי ניסיון אחד נדלק "המשך" (s16AppletAttempted ב-script.js).
   - ניתן לשחק ללא הגבלה: אפשר לגרור קוביה מהכוס בחזרה ולהניח שוב.
   מערכת הקואורדינטות: פיקסלים בתוך מסגרת היישומון (625×628), לא מושפעת
   מקנה-המידה של #app (מחושב מ-getBoundingClientRect).
   ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('s16-applet');
  if (!root) return;

  var CUBE = 160;          // גודל קוביה במקור (px)
  var IN_GLASS = 0.65;     // קנה מידה בתוך הכוס
  var WATER_Y = 456;       // קו פני המים (מרכז)
  var FLOOR_Y = 597;       // תחתית הכוס (פנימית)
  var ZONE = { x: 34, y: 200, w: 220, h: 84 };
  var GLASS = { x: 14, y: 389, w: 260, h: 231 };
  var ZONE_C = { x: ZONE.x + ZONE.w / 2, y: ZONE.y + ZONE.h / 2 };

  var CUBES = {
    pine: {
      name: 'خشب الصنوبر', density: '0.5', floats: true,
      home: { x: 497, y: 190 }, slot: { x: 92, y: WATER_Y }, sub: '50%',
      img: 'applet/images/cube-pine.png',
      sr: 'مكعب خشب الصنوبر يطفو على الماء.'
    },
    iron: {
      name: 'الحديد', density: '7.9', floats: false,
      home: { x: 497, y: 420 }, slot: { x: 196, y: FLOOR_Y - CUBE * IN_GLASS / 2 }, sub: '0%',
      img: 'applet/images/cube-iron.png',
      sr: 'مكعب الحديد يغوص إلى قاع الكوب.'
    }
  };

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DOM ---------- */
  var html = '';
  html += '<div class="ap-zone" id="ap-zone"><span>اسحبوا إلى هنا وأفلتوا</span></div>';
  html += '<img class="ap-glass" src="applet/images/glass-water.png" alt="كوب ماء">';
  ['pine', 'iron'].forEach(function (k) {
    var c = CUBES[k];
    html += '<img class="ap-ghost" id="ap-ghost-' + k + '" src="' + c.img + '" alt="" draggable="false" ' +
              'style="left:' + (c.home.x - CUBE / 2) + 'px;top:' + (c.home.y - CUBE / 2) + 'px">';
  });
  ['pine', 'iron'].forEach(function (k) {
    var c = CUBES[k];
    html += '<div class="ap-cube" id="ap-cube-' + k + '" data-k="' + k + '" role="button" tabindex="0" ' +
              'aria-label="مكعب ' + c.name + '، الكثافة ' + c.density + ' جرام/سم³. اسحبوا إلى الكأس، أو اضغطوا Enter لإدخاله إلى الكأس ومرة أخرى لإخراجه">' +
              '<img class="ap-cube__img" src="' + c.img + '" alt="" draggable="false">' +
              '<img class="ap-cube__tint" src="' + c.img + '" alt="" draggable="false" style="--sub:' + c.sub + '">' +
              '<span class="ap-cube__tag"><b>' + c.density + '</b><i>جرام / سم³</i></span></div>';
  });
  html += '<p class="sr-only" id="ap-live" aria-live="polite"></p>';
  root.innerHTML = html;
  root.classList.add('ap-root');

  var zoneEl = document.getElementById('ap-zone');
  var live = document.getElementById('ap-live');

  CUBES.pine.el = document.getElementById('ap-cube-pine');
  CUBES.iron.el = document.getElementById('ap-cube-iron');
  Object.keys(CUBES).forEach(function (k) {
    var c = CUBES[k];
    c.ghost = document.getElementById('ap-ghost-' + k);
    c.state = 'home';   // home | glass | drag
    c.cx = c.home.x; c.cy = c.home.y; c.s = 1;
    c.anim = null;
    put(c);
  });

  /* ---------- מיקום ---------- */
  function put(c) {
    c.el.style.left = (c.cx - CUBE / 2) + 'px';
    c.el.style.top = (c.cy - CUBE / 2) + 'px';
    c.el.style.transform = 'scale(' + c.s + ')';
  }
  function frame(cx, cy, s) {
    return { left: (cx - CUBE / 2) + 'px', top: (cy - CUBE / 2) + 'px', transform: 'scale(' + s + ')' };
  }
  function stopAnim(c) {
    if (c.anim) { try { c.anim.cancel(); } catch (e) { /* noop */ } c.anim = null; }
  }
  function run(c, frames, duration, easing) {
    stopAnim(c);
    var last = frames[frames.length - 1];
    var done = function () {
      c.anim = null;
      c.el.style.left = last.left; c.el.style.top = last.top; c.el.style.transform = last.transform;
    };
    if (reduced || !c.el.animate) { done(); return Promise.resolve(); }
    c.anim = c.el.animate(frames, { duration: duration, easing: easing || 'ease', fill: 'forwards' });
    return c.anim.finished.then(done, function () { /* בוטל */ });
  }
  function k() { // קנה מידה של #app
    var r = root.getBoundingClientRect();
    return r.width / root.offsetWidth || 1;
  }

  /* ---------- מצבים ---------- */
  // צל שקוף של הקוביה במקומה הקבוע כל עוד היא לא שם (בגרירה או בכוס)
  function syncGhost(c) { c.ghost.classList.toggle('is-on', c.state !== 'home'); }

  function setInWater(c, on) { c.el.classList.toggle('is-in-water', on); }

  function sendHome(c) {
    setInWater(c, false);
    c.state = 'home'; syncGhost(c); c.el.classList.remove('is-dragging');
    var from = frame(c.cx, c.cy, c.s);
    c.cx = c.home.x; c.cy = c.home.y; c.s = 1;
    return run(c, [from, frame(c.cx, c.cy, 1)], 380, 'cubic-bezier(.2,.8,.3,1)');
  }

  function dropIntoGlass(c) {
    var token = (c.token = (c.token || 0) + 1);
    c.state = 'glass'; syncGhost(c);
    c.el.classList.remove('is-dragging');
    setInWater(c, false);
    if (window.s16AppletAttempted) window.s16AppletAttempted();

    var from = frame(c.cx, c.cy, c.s);
    var toZone = frame(ZONE_C.x, ZONE_C.y, 1);
    var slot = c.slot;
    c.cx = slot.x; c.cy = slot.y; c.s = IN_GLASS;
    var end = frame(slot.x, slot.y, IN_GLASS);

    run(c, [from, toZone], 220, 'ease-out').then(function () {
      if (token !== c.token || c.state !== 'glass') return;
      var start = frame(ZONE_C.x, ZONE_C.y, 1);
      var enter = function () { if (token === c.token && c.state === 'glass') setInWater(c, true); };
      if (c.floats) {
        // נופלת מעט מתחת לפני המים ועולה חזרה — צפה
        var deep = frame(slot.x, WATER_Y + 62, IN_GLASS);
        var dip = frame(slot.x, WATER_Y + 12, IN_GLASS);
        var f = [start, deep, end, dip, frame(slot.x, slot.y, IN_GLASS)];
        f[2] = frame(slot.x, slot.y, IN_GLASS);
        f[0].offset = 0; f[1].offset = 0.40; f[2].offset = 0.72; f[3].offset = 0.86; f[4].offset = 1;
        f[0].easing = 'cubic-bezier(.5,0,.9,.6)'; f[1].easing = 'cubic-bezier(.2,.7,.3,1)';
        f[2].easing = 'ease-in-out'; f[3].easing = 'ease-in-out';
        setTimeout(enter, reduced ? 0 : 330);
        run(c, f, 1500, 'linear').then(function () { say(c.sr, token, c); });
      } else {
        // שוקעת עד התחתית ונחה
        var bounce = frame(slot.x, slot.y - 14, IN_GLASS);
        var g = [start, frame(slot.x, slot.y, IN_GLASS), bounce, frame(slot.x, slot.y, IN_GLASS)];
        g[0].offset = 0; g[1].offset = 0.62; g[2].offset = 0.82; g[3].offset = 1;
        g[0].easing = 'cubic-bezier(.45,0,.9,.55)'; g[1].easing = 'ease-out'; g[2].easing = 'ease-in';
        setTimeout(enter, reduced ? 0 : 330);
        run(c, g, 1100, 'linear').then(function () { say(c.sr, token, c); });
      }
    });
  }

  function say(text, token, c) {
    if (token === c.token) live.textContent = text;
  }

  /* ---------- גרירה (Pointer Events — עכבר ומגע) ---------- */
  var drag = null;

  function onDown(e) {
    var el = e.target.closest('.ap-cube');
    if (!el || e.button > 0) return;
    var c = CUBES[el.dataset.k];
    e.preventDefault();
    stopAnim(c);
    c.token = (c.token || 0) + 1;   // מבטל אנימציית נפילה בתהליך
    var scale = k();
    var r = root.getBoundingClientRect();
    var px = (e.clientX - r.left) / scale, py = (e.clientY - r.top) / scale;
    // לוכדים את מרכז הקוביה כפי שהוא כרגע (כולל אם האנימציה באמצע)
    var cr = el.getBoundingClientRect();
    c.cx = (cr.left + cr.width / 2 - r.left) / scale;
    c.cy = (cr.top + cr.height / 2 - r.top) / scale;
    var curS = (cr.width / scale) / CUBE;
    drag = {
      c: c, id: e.pointerId,
      dx: (px - c.cx) / (curS || 1), dy: (py - c.cy) / (curS || 1),
      moved: false, sx: e.clientX, sy: e.clientY
    };
    c.s = 1.06;
    c.state = 'drag'; syncGhost(c);
    setInWater(c, false);
    el.classList.add('is-dragging');
    put(c);
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c, scale = k();
    var r = root.getBoundingClientRect();
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    c.cx = (e.clientX - r.left) / scale - drag.dx * 1.06;
    c.cy = (e.clientY - r.top) / scale - drag.dy * 1.06;
    put(c);
    zoneEl.classList.toggle('is-over', hit(c.cx, c.cy));
  }

  function hit(cx, cy) {
    var inZone = cx > ZONE.x && cx < ZONE.x + ZONE.w && cy > ZONE.y - 20 && cy < ZONE.y + ZONE.h + 20;
    var inGlass = cx > GLASS.x && cx < GLASS.x + GLASS.w && cy > GLASS.y && cy < GLASS.y + GLASS.h;
    return inZone || inGlass;
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c, moved = drag.moved;
    drag = null;
    zoneEl.classList.remove('is-over');
    c.el.classList.remove('is-dragging');
    if (!moved) {
      // לחיצה על קוביה שבתוך הכוס מוציאה אותה החוצה; לחיצה על קוביה במקומה — ללא שינוי
      if (c.slotWas === 'glass') sendHome(c);
      else { c.cx = c.home.x; c.cy = c.home.y; c.s = 1; c.state = 'home'; syncGhost(c); put(c); }
      return;
    }
    if (hit(c.cx, c.cy)) dropIntoGlass(c); else sendHome(c);
  }

  root.addEventListener('pointerdown', function (e) {
    var el = e.target.closest('.ap-cube');
    if (el) { var c = CUBES[el.dataset.k]; c.slotWas = c.state === 'glass' ? 'glass' : 'home'; }
    onDown(e);
  });
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c; drag = null; zoneEl.classList.remove('is-over'); sendHome(c);
  });

  /* ---------- מקלדת ---------- */
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest && e.target.closest('.ap-cube');
    if (!el) return;
    e.preventDefault();
    var c = CUBES[el.dataset.k];
    if (c.state === 'glass') { c.token = (c.token || 0) + 1; stopAnim(c); sendHome(c); live.textContent = 'تمّت إعادة المكعّب.'; }
    else if (c.state === 'home') dropIntoGlass(c);
  });
})();

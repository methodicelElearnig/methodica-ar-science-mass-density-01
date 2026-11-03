/* =========================================================
   יישומון "מעבדת הצפיפות" — מסך 3 (שקפים 43+44). נטמע ב-#s2-applet (index.html).
   עצמאי: בונה את ה-DOM בעצמו. הנחיות מפיקה (הערות שקף 43):
   - גוררים כל חומר למאזניים → על הצג מופיעה המסה; גוררים למשורה → מפלס המים עולה
     והלומד מחשב את הפער (נפח).
   - כפתור "איפוס" גם במשורה וגם במאזניים; אפשר לגרור ולהחליף בין החומרים בחופשיות.
   נתוני החומרים (תשובות השקף): א' מסה 81 / נפח 30 · ב' 25 / 50 · ג' 89.6 / 10.
   המשורה מצוירת ב-SVG (מפלס המים משתנה — תמונה סטטית לא יכולה); מפלס התחלתי 50 מ"ל.
   מסגרת 512×520 (40% מרוחב המסך); הקואורדינטות בפיקסלים בתוכה, ללא תלות בקנה-המידה של #app.
   ========================================================= */
(function () {
  'use strict';

  var root = document.getElementById('s2-applet');
  if (!root) return;

  var SIZE = 84;                 // גודל קוביה בבית (px)
  var S_BAL = 0.8;               // קנה מידה על המאזניים
  var S_CYL = 0.6;               // קנה מידה בתוך המשורה
  var WATER0 = 50;               // מפלס התחלתי (מ"ל)
  /* משורה (SVG 170×316, ממוקם ב-left:84, top:134) */
  var CYL = { x: 6, y: 150 };
  var Y0 = 284, PX = 2.4;        // y של 0 מ"ל בתוך ה-SVG; פיקסלים למ"ל
  var TUBE = { x1: 52, x2: 112 };
  var ZONES = {
    balance: { x: 206, y: 180, w: 280, h: 215 },
    cyl:     { x: 0,   y: 150, w: 175, h: 310 }
  };
  var SLOT = {
    balance: { x: 338, y: 340 },
    cyl:     { x: CYL.x + (TUBE.x1 + TUBE.x2) / 2, y: CYL.y + Y0 - SIZE * S_CYL / 2 - 2 }
  };

  var ITEMS = {
    a: { name: "المادة أ'", mass: 81,   vol: 30, home: { x: 424, y: 52 }, img: 'assets/images/cube-aluminum-noshadow.png' },
    b: { name: "مادة ب'", mass: 25,   vol: 50, home: { x: 256, y: 52 }, img: 'assets/images/cube-pine-noshadow.png' },
    c: { name: "مادة ج'", mass: 89.6, vol: 10, home: { x: 88, y: 52 }, img: 'assets/images/cube-copper-noshadow.png' }
  };
  var KEYS = ['a', 'b', 'c'];

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DOM ---------- */
  function cylSvg() {
    var s = '<svg class="lab-cyl" viewBox="0 0 170 316" aria-hidden="true">';
    s += '<defs><linearGradient id="lab-glass" x1="0" x2="1"><stop offset="0" stop-color="#dff1fa" stop-opacity=".75"/>' +
         '<stop offset=".35" stop-color="#ffffff" stop-opacity=".35"/><stop offset="1" stop-color="#cfe6f2" stop-opacity=".7"/></linearGradient></defs>';
    // רגל
    s += '<path d="M30 312 Q30 296 52 292 L112 292 Q134 296 134 312 Z" fill="#e3f2f9" stroke="#8fb6c9" stroke-width="1.5"/>';
    // מים
    s += '<rect id="lab-water" x="' + (TUBE.x1 + 1) + '" y="' + (Y0 - WATER0 * PX) + '" width="' + (TUBE.x2 - TUBE.x1 - 2) +
         '" height="' + (WATER0 * PX + 6) + '" fill="#7cc8ee" fill-opacity=".55"/>';
    s += '<rect id="lab-meniscus" x="' + (TUBE.x1 + 1) + '" y="' + (Y0 - WATER0 * PX - 1) + '" width="' + (TUBE.x2 - TUBE.x1 - 2) +
         '" height="3" fill="#3b9fd3" fill-opacity=".8"/>';
    // צינור
    s += '<rect x="' + TUBE.x1 + '" y="14" width="' + (TUBE.x2 - TUBE.x1) + '" height="' + (Y0 + 8 - 14) +
         '" rx="3" fill="url(#lab-glass)" stroke="#8fb6c9" stroke-width="2"/>';
    // קו מפלס התחלתי (50 סמ"ק) — מסומן תמיד באדום
    s += '<line x1="' + (TUBE.x1 - 6) + '" x2="' + TUBE.x2 + '" y1="' + (Y0 - WATER0 * PX) + '" y2="' + (Y0 - WATER0 * PX) + '" stroke="#e03131" stroke-width="2.4"/>';
    // סקלה
    for (var ml = 0; ml <= 110; ml += 2) {
      var y = Y0 - ml * PX, len = (ml % 10 === 0) ? 18 : (ml % 5 === 0 ? 12 : 7);
      s += '<line x1="' + TUBE.x2 + '" x2="' + (TUBE.x2 - len) + '" y1="' + y + '" y2="' + y + '" stroke="#9a5a1e" stroke-width="' + (ml % 10 === 0 ? 1.6 : 1) + '"/>';
      if (ml % 10 === 0 && ml > 0 && ml <= 100) {
        s += '<text x="' + (TUBE.x2 + 7) + '" y="' + (y + 4) + '" font-family="Calibri, Arial, sans-serif" font-size="13" font-weight="700" fill="' + (ml === WATER0 ? '#e03131' : '#9a5a1e') + '">' + ml + '</text>';
      }
    }
    s += '<text x="' + (TUBE.x2 + 7) + '" y="' + (Y0 - 108 * PX + 4) + '" font-family="Calibri, Arial, sans-serif" font-size="13" font-weight="700" fill="#9a5a1e">ml</text>';
    s += '</svg>';
    return s;
  }

  var html = '';
  html += '<div class="lab-zone" id="lab-zone-balance" style="left:' + ZONES.balance.x + 'px;top:' + ZONES.balance.y + 'px;width:' + ZONES.balance.w + 'px;height:' + ZONES.balance.h + 'px"></div>';
  html += '<div class="lab-zone" id="lab-zone-cyl" style="left:' + ZONES.cyl.x + 'px;top:' + ZONES.cyl.y + 'px;width:' + ZONES.cyl.w + 'px;height:' + ZONES.cyl.h + 'px"></div>';
  html += '<img class="lab-balance" src="assets/images/balance.png" alt="ميزان رقمي">';
  html += '<div class="lab-lcd" aria-hidden="true"><b id="lab-lcd-val">0.00</b><i>g</i></div>';
  html += cylSvg();
  KEYS.forEach(function (k) {
    var c = ITEMS[k];
    html += '<div class="lab-chip" style="left:' + (c.home.x - 56) + 'px;top:100px">' + c.name + '</div>';
  });
  KEYS.forEach(function (k) {
    var c = ITEMS[k];
    html += '<img class="lab-ghost" id="lab-ghost-' + k + '" src="' + c.img + '" alt="" draggable="false" ' +
            'style="left:' + (c.home.x - SIZE / 2) + 'px;top:' + (c.home.y - SIZE / 2) + 'px">';
  });
  KEYS.forEach(function (k) {
    var c = ITEMS[k];
    html += '<div class="lab-cube" id="lab-cube-' + k + '" data-k="' + k + '" role="button" tabindex="0" ' +
            'aria-label="' + c.name + '. اسحبوا إلى الميزان أو إلى المخبار المدرج، أو اضغطوا Enter للانتقال بين الأماكن">' +
            '<img src="' + c.img + '" alt="" draggable="false"></div>';
  });
  html += '<button type="button" class="lab-reset" id="lab-reset-cyl" style="left:43px; top:474px" aria-label="إعادة ضبط المخبار المدرج">إعادة ضبط</button>';
  html += '<button type="button" class="lab-reset" id="lab-reset-balance" style="left:295px; top:474px" aria-label="إعادة ضبط الميزان">إعادة ضبط</button>';
  html += '<p class="sr-only" id="lab-live" aria-live="polite"></p>';
  root.innerHTML = html;
  root.classList.add('lab-root');

  var live = document.getElementById('lab-live');
  var lcd = document.getElementById('lab-lcd-val');
  var water = document.getElementById('lab-water');
  var mensc = document.getElementById('lab-meniscus');
  var zoneEls = { balance: document.getElementById('lab-zone-balance'), cyl: document.getElementById('lab-zone-cyl') };
  var occupant = { balance: null, cyl: null };

  KEYS.forEach(function (k) {
    var c = ITEMS[k];
    c.key = k;
    c.el = document.getElementById('lab-cube-' + k);
    c.ghost = document.getElementById('lab-ghost-' + k);
    c.state = 'home';            // home | balance | cyl | drag
    c.cx = c.home.x; c.cy = c.home.y; c.s = 1;
    c.anim = null;
    put(c);
  });

  /* ---------- מיקום ---------- */
  function put(c) {
    c.el.style.left = (c.cx - SIZE / 2) + 'px';
    c.el.style.top = (c.cy - SIZE / 2) + 'px';
    c.el.style.transform = 'scale(' + c.s + ')';
  }
  function frame(cx, cy, s) {
    return { left: (cx - SIZE / 2) + 'px', top: (cy - SIZE / 2) + 'px', transform: 'scale(' + s + ')' };
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
  function scaleK() {
    var r = root.getBoundingClientRect();
    return r.width / root.offsetWidth || 1;
  }

  /* ---------- צג ומפלס ---------- */
  function fmtMass(v) { return v.toFixed(2); }
  var waterNow = WATER0, waterRaf = 0;
  function drawWater(ml) {
    var y = Y0 - ml * PX;
    water.setAttribute('y', y); water.setAttribute('height', Y0 - y + 6);
    mensc.setAttribute('y', y - 1);
  }
  function setWater(target) {
    cancelAnimationFrame(waterRaf);
    var from = waterNow, t0 = null, dur = reduced ? 0 : 750;
    function step(ts) {
      if (t0 === null) t0 = ts;
      var p = dur ? Math.min(1, (ts - t0) / dur) : 1;
      var e = 1 - Math.pow(1 - p, 3);
      waterNow = from + (target - from) * e;
      drawWater(waterNow);
      if (p < 1) waterRaf = requestAnimationFrame(step);
    }
    waterRaf = requestAnimationFrame(step);
  }
  function refreshReadouts(announce) {
    var b = occupant.balance, c = occupant.cyl;
    lcd.textContent = b ? fmtMass(ITEMS[b].mass) : '0.00';
    setWater(c ? WATER0 + ITEMS[c].vol : WATER0);
    if (announce) {
      var msg = [];
      if (b) msg.push('الكتلة على الميزان: ' + ITEMS[b].mass + ' غرام.');
      if (c) msg.push('مستوى الماء في المخبار المدرج: ' + (WATER0 + ITEMS[c].vol) + ' مليلتر.');
      if (!b && !c) msg.push('المعدات فارغة.');
      live.textContent = msg.join(' ');
    }
  }

  /* ---------- מצבים ---------- */
  function syncGhost(c) { c.ghost.classList.toggle('is-on', c.state !== 'home'); }
  function release(c) {            // משחרר את ההתקן שהחומר תפס
    ['balance', 'cyl'].forEach(function (d) { if (occupant[d] === c.key) occupant[d] = null; });
  }

  function sendHome(c, silent) {
    release(c);
    c.state = 'home'; syncGhost(c); c.el.classList.remove('is-dragging');
    var from = frame(c.cx, c.cy, c.s);
    c.cx = c.home.x; c.cy = c.home.y; c.s = 1;
    refreshReadouts(!silent);
    return run(c, [from, frame(c.cx, c.cy, 1)], 380, 'cubic-bezier(.2,.8,.3,1)');
  }

  function placeOn(c, dev) {
    var other = occupant[dev];
    if (other && other !== c.key) sendHome(ITEMS[other], true);   // החלפה חופשית בין חומרים
    release(c);
    occupant[dev] = c.key;
    c.state = dev; syncGhost(c); c.el.classList.remove('is-dragging');
    var slot = SLOT[dev], s = dev === 'balance' ? S_BAL : S_CYL;
    var from = frame(c.cx, c.cy, c.s);
    c.cx = slot.x; c.cy = slot.y; c.s = s;
    var token = (c.token = (c.token || 0) + 1);
    run(c, [from, frame(slot.x, slot.y, s)], 320, 'cubic-bezier(.3,.7,.3,1)').then(function () {
      if (token === c.token && c.state === dev) refreshReadouts(true);
    });
    // המסה/המפלס מתעדכנים מיד עם ההנחה (המים עולים תוך כדי הצניחה)
    refreshReadouts(false);
  }

  function resetDevice(dev) {
    var k = occupant[dev];
    if (k) sendHome(ITEMS[k]); else refreshReadouts(true);
  }

  /* ---------- גרירה (Pointer Events — עכבר ומגע) ---------- */
  var drag = null;
  function inZone(z, cx, cy) {
    return cx > z.x && cx < z.x + z.w && cy > z.y && cy < z.y + z.h;
  }
  function target(cx, cy) {
    if (inZone(ZONES.balance, cx, cy)) return 'balance';
    if (inZone(ZONES.cyl, cx, cy)) return 'cyl';
    return null;
  }

  function onDown(e) {
    var el = e.target.closest('.lab-cube');
    if (!el || e.button > 0) return;
    var c = ITEMS[el.dataset.k];
    e.preventDefault();
    stopAnim(c);
    c.token = (c.token || 0) + 1;
    var scale = scaleK();
    var r = root.getBoundingClientRect();
    var px = (e.clientX - r.left) / scale, py = (e.clientY - r.top) / scale;
    var cr = el.getBoundingClientRect();
    c.cx = (cr.left + cr.width / 2 - r.left) / scale;
    c.cy = (cr.top + cr.height / 2 - r.top) / scale;
    var curS = (cr.width / scale) / SIZE;
    drag = { c: c, id: e.pointerId, dx: (px - c.cx) / (curS || 1), dy: (py - c.cy) / (curS || 1), moved: false, sx: e.clientX, sy: e.clientY, from: c.state };
    release(c);
    c.s = 1.06;
    c.state = 'drag'; syncGhost(c);
    el.classList.add('is-dragging');
    put(c);
    refreshReadouts(false);
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
  }
  function onMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c, scale = scaleK();
    var r = root.getBoundingClientRect();
    if (Math.abs(e.clientX - drag.sx) + Math.abs(e.clientY - drag.sy) > 4) drag.moved = true;
    c.cx = (e.clientX - r.left) / scale - drag.dx * 1.06;
    c.cy = (e.clientY - r.top) / scale - drag.dy * 1.06;
    put(c);
    var t = target(c.cx, c.cy);
    zoneEls.balance.classList.toggle('is-over', t === 'balance');
    zoneEls.cyl.classList.toggle('is-over', t === 'cyl');
  }
  function onUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c, d = drag;
    drag = null;
    zoneEls.balance.classList.remove('is-over'); zoneEls.cyl.classList.remove('is-over');
    c.el.classList.remove('is-dragging');
    if (!d.moved) {                 // לחיצה בלי גרירה: חומר שעל התקן חוזר למקומו; חומר בבית — ללא שינוי
      if (d.from === 'balance' || d.from === 'cyl') { sendHome(c); }
      else { c.cx = c.home.x; c.cy = c.home.y; c.s = 1; c.state = 'home'; syncGhost(c); put(c); refreshReadouts(true); }
      return;
    }
    var t = target(c.cx, c.cy);
    if (t) placeOn(c, t); else sendHome(c);
  }

  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var c = drag.c; drag = null;
    zoneEls.balance.classList.remove('is-over'); zoneEls.cyl.classList.remove('is-over');
    sendHome(c);
  });

  /* ---------- מקלדת: Enter על חומר — בית → מאזניים → משורה → בית ---------- */
  root.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest && e.target.closest('.lab-cube');
    if (!el) return;
    e.preventDefault();
    var c = ITEMS[el.dataset.k];
    stopAnim(c);
    if (c.state === 'home') placeOn(c, 'balance');
    else if (c.state === 'balance') placeOn(c, 'cyl');
    else sendHome(c);
  });

  document.getElementById('lab-reset-balance').addEventListener('click', function () { resetDevice('balance'); });
  document.getElementById('lab-reset-cyl').addEventListener('click', function () { resetDevice('cyl'); });
})();

/* נעילת רוחב כפתורים בזמן hover — בהובר הטקסט הופך ל-SemiBold (Figma nav button)
   והכפתור לא אמור להשתנות ברוחב. הרוחב ננעל לרוחב של מצב Default (לפני ה-SemiBold):
   מאלצים זמנית font-weight:400 כדי למדוד, ומחזירים. .btn-hint לא כלול — הרוחב שלו קבוע ב-CSS (sizer .nav-label). */
(function () {
  var SEL = '.btn-back, .btn-continue, .popup-action, .s8q-hint-close, .scq-hint-close';
  document.addEventListener('mouseover', function (e) {
    var b = e.target.closest && e.target.closest(SEL);
    if (!b || b.dataset.wLock) return;
    var prev = b.style.fontWeight;
    b.style.fontWeight = '400';
    var w = b.offsetWidth; /* רוחב layout — לא מושפע מ-scale של הקנבס */
    b.style.fontWeight = prev;
    b.dataset.wLock = '1';
    b.style.width = w + 'px';
  });
  document.addEventListener('mouseout', function (e) {
    var b = e.target.closest && e.target.closest(SEL);
    if (!b || !b.dataset.wLock || (e.relatedTarget && b.contains(e.relatedTarget))) return;
    delete b.dataset.wLock;
    b.style.width = '';
  });
})();

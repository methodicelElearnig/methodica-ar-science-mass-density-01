/* Local stand-in for the CDN xapi-720-k.js, for verifying reporting and resume offline.
   NOT shipped — loaded only via ?xapiLib=../_test/xapi-720-k.js, which 50-loader.js honours on
   localhost alone.

   ⚠️ The filename must keep the "xapi-720-k.js" ending: 50-loader.js sets window.XAPI_USING_G
   from a regex on the library URL (`/xapi-720-[ghijk]\.js/`), and a name that does not match
   silences every item-level statement — with no visible error. Renamed -j → -k on 2026-10-20
   together with the unit's move to the -k library (helpType on 'requested') and the
   per-component State document (v5).

   methodica-science-mass-density-01 (2026-11-02): copied from methodica-science-mass-density-01/_test/ (keys retargeted).
   methodica-science-mass-density-01 (2026-11-01): copied from methodica-science-mass-liquid-02/_test/, with
   __reset retargeted to this unit (state keys, the engine's own session keys, the character).
   methodica-science-mass-liquid-02 (2026-10-22): copied from methodica-science-volume-solid-01/_test/
   xapi-720-k.js (whose __reset clears the right keys — body-matter-01's still cleared ratio-01's),
   itself adapted from body-matter-01 (verified live 2026-10-20); only the keys below retargeted.

   State and the statement log live in sessionStorage, so both survive a reload — which is what
   the resume walk exercises. saveState720Debounced really does defer 800 ms, so the stale-timer
   race the write paths guard against is reproducible here.

   Mirrors -k's diagnostics layer too: stateLastResult720() returns {op,status,ok,reason}, and
   __failWrites accepts a status so every reason branch is reachable locally — e.g.
   __failWrites(413) for the 1 MB cap.

   Console helpers: __stmts() __state() __setState(doc) __dupes() __reset() __failWrites(bool|status)
                    __lastState() __screenIds() __sweep() */
(function () {
  'use strict';

  var STATE_KEY = '__test_state';
  var LOG_KEY   = '__test_statements';
  var FAIL_KEY  = '__test_fail_writes';

  /* ── -k diagnostics ──
     Same contract as the library: {op,status,ok,reason}. The reason map is the one in
     720-common-lib/xapi-720-k.js, so a check that passes against the stub describes what will
     happen against the real Kata and not something else. */
  var _lastResult = null;
  function reasonFor(op, status) {
    if (status >= 200 && status < 300) return 'ok';
    switch (status) {
      case 0:   return 'network';
      case 400: return 'bad-address';
      case 401: return 'auth';
      case 404: return (op === 'load') ? 'absent' : 'no-launch';
      case 412: return 'stale';
      case 413: return 'too-large';
      case 422: return 'validation';
      default:  return 'http-' + status;
    }
  }
  function record(op, status, ok, reason) {
    _lastResult = {
      op: op, status: status, ok: !!ok,
      reason: reason || reasonFor(op, status),
      at: new Date().toISOString()
    };
    return _lastResult;
  }
  window.stateLastResult720 = function () { return _lastResult; };

  /* The simulated failure. A boolean is kept for backward compatibility; a number targets a
     specific status so every reason branch is reachable — e.g. __failWrites(413). */
  function forcedStatus() {
    try {
      var v = sessionStorage.getItem(FAIL_KEY);
      if (v === null || v === '0' || v === 'false') return 0;
      if (v === '1' || v === 'true') return 500;
      var n = parseInt(v, 10);
      return isNaN(n) ? 500 : n;
    } catch (e) { return 0; }
  }

  function readLog() {
    try { return JSON.parse(sessionStorage.getItem(LOG_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeLog(a) {
    try { sessionStorage.setItem(LOG_KEY, JSON.stringify(a)); } catch (e) {}
  }
  function currentPart() {
    return window.location.pathname.split('/').filter(Boolean).slice(-2)[0] || '';
  }

  /* The map of items already answered in this page load — exactly what the real library holds,
     and what xapiSeedAnsweredFromResume() in 20-xapi.js re-seeds after a restore. Must live on
     window: the seeding reaches it exactly so. */
  window.xapiItemAnswered = window.xapiItemAnswered || {};

  /* Must be a window property: applyExecutionState (30-nav.js) swaps it for a no-op across the
     restore's goTo, and the calls in 20-xapi.js are bare and so resolve through window. If the
     real library ever moves to const/let, this stub breaks silently and resume re-reports
     everything. */
  window.sendStatement720 = function (verb, objectType, result, opts) {
    /* The real library strips the suffix before any check: sttmType = sttmRowType.split(".")[0],
       so 'answered.last' counts too. */
    var sttmType = String(verb).split('.')[0];
    if (sttmType === 'answered' && opts && opts.parentId) {
      window.xapiItemAnswered[opts.parentId] = true;
    }

    /* ── The real library's drop gate ──
       An item that expects an answer and was not answered in this page load — its 'completed' is
       dropped. No queue, no retry: that return is a permanent loss. Without mimicking the gate
       here the stub is more forgiving than the library and the suite is blind to this bug — which
       is how it escaped every assertion until a live Kata run on 2026-09-07. */
    if (sttmType === 'completed' && opts && opts.objectId != null &&
        opts.expectsAnswer && !window.xapiItemAnswered[opts.objectId]) {
      console.log('[stub] item left unanswered — deferring completed ' + opts.objectId);
      return;
    }

    var log = readLog();
    log.push({
      verb: verb,
      objectType: objectType,
      part: currentPart(),
      objectId: (opts && opts.objectId) || null,
      /* The whole opts object, not just objectId: the real library reads scope,
         isEvaluationItem, expectsAnswer, questionId, parentId and helpType from here too. */
      opts: opts || null,
      result: result || null
    });
    writeLog(log);
    console.log('[stub] ' + verb + ' ' + objectType +
      (opts && opts.objectId   ? ' obj=' + opts.objectId   : '') +
      (opts && opts.questionId ? ' q='   + opts.questionId : '') +
      (opts && opts.parentId   ? ' par=' + opts.parentId   : ''));
  };

  /* One document per component (v5): the key carries the stateId, which 40-resume.js derives
     from the part slug. */
  function stateKey(id) { return STATE_KEY + '::' + (id || 'execution-state'); }

  window.loadState720 = function (id) {
    try {
      var raw = sessionStorage.getItem(stateKey(id));
      /* absent is not a failure — it is the first read of a new registration, the case -j could
         not tell apart from a 401 or a 500. */
      record('load', raw ? 200 : 404, true, raw ? 'ok' : 'absent');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { record('load', 0, false, 'threw'); return null; }
  };

  /* Returns false on a simulated failure — exactly what persistUnitState checks (!== false).
     Same return contract as -k: true/false only, the detail in stateLastResult720(). */
  window.saveState720 = function (id, doc) {
    try {
      var forced = forcedStatus();
      if (forced) {
        var r = record('save', forced, false);
        console.warn('[stub] save FORCED FAIL status', forced, 'reason', r.reason);
        return false;
      }
      sessionStorage.setItem(stateKey(id), JSON.stringify(doc));
      record('save', 204, true);
      return true;
    } catch (e) { record('save', 0, false, 'threw'); return false; }
  };

  var _t = null;
  window.saveState720Debounced = function (id, doc) {
    /* ⚠️ Holds the REFERENCE and serialises at FIRE time, matching the real library:
           _stateSaveTimers720[stateId] = setTimeout(function () { saveState720(stateId, obj); })
       A stub that snapshots at arm time invents a clobber race that does not exist (a timer armed
       on navigation appears to overwrite the later synchronous write with pre-answer state).
       Because captureUnitState returns the same object every time, the deferred write lands the
       UPDATED state. */
    if (_t) clearTimeout(_t);
    _t = setTimeout(function () {
      /* -k: goes through saveState720 itself, so a failure is recorded and visible. */
      var ok = window.saveState720(id, doc);
      if (ok === false) {
        var r = window.stateLastResult720();
        console.warn('[stub] deferred write FAILED reason', r && r.reason);
      } else {
        console.log('[stub] debounced write landed');
      }
    }, 800);
  };

  /* The metadata really is fetched from disk, so the ID-mismatch check in 50-loader.js runs
     against the real source instead of crying wolf during a browser walk.
     A 404 must NOT resolve the poll: the real library leaves jsXAPI_MetadataReady unset when the
     metadata cannot be fetched, and the loader's bounded poll then reports which file to check. */
  window.getXAPIParameters = function (file) {
    fetch(file)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (j) {
        window.METADATA = j;
        if (j && j.title) document.title = j.title;
        window.jsXAPI_MetadataReady = true;
        console.log('[stub] METADATA loaded', file);
      })
      .catch(function (e) {
        console.warn('[stub] metadata fetch failed, leaving jsXAPI_MetadataReady unset', file, e);
      });
  };

  /* Every part calls this from onXapiReady() to open the UNIT metadata, which feeds the
     bug-report form. Loaded from disk for the same reason as the component metadata. */
  window.loadUnitMetadata = function (file, cb) {
    fetch(file)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) { if (j) window.UNIT_METADATA = j; })
      .catch(function (e) { console.warn('[stub] unit metadata fetch failed', file, e); })
      .then(function () { if (typeof cb === 'function') { try { cb(); } catch (e) { console.error('[stub] loadUnitMetadata cb', e); } } });
  };

  window.ADL = window.ADL || { XAPIWrapper: { changeConfig: function () {} } };
  window.slxapi = window.slxapi || { endpoint: 'stub', auth: 'stub', actor: {} };

  /* ── Console helpers ── */
  window.__stmts = readLog;
  window.__state = function () {
    return window.loadState720(typeof RESUME_STATE_ID !== 'undefined' ? RESUME_STATE_ID : undefined);
  };
  window.__reset = function () {
    try {
      Object.keys(sessionStorage).filter(function (k) { return k.indexOf(STATE_KEY) === 0; })
        .forEach(function (k) { sessionStorage.removeItem(k); });
      sessionStorage.removeItem(LOG_KEY);
      sessionStorage.removeItem(FAIL_KEY);
      sessionStorage.removeItem('lomda_nav_edges::methodica-science-mass-density-01');
      Object.keys(sessionStorage).filter(function (k) { return k.indexOf('methodica-science-mass-density-01:') === 0; })
        .forEach(function (k) { sessionStorage.removeItem(k); });
    } catch (e) {}
    /* The character and the מועד א verdict live in the State document; localStorage is a cache
       only. Clear it too — otherwise __reset() leaves the previous run's character and verdict
       alive in the window before the document is read. Same cleanup as initResumeResetHatch:
       UI_CHARACTER_KEY and RESULT_KEYS in unit-js/40-resume.js. */
    try {
      localStorage.removeItem('methodica_science_mass_gas_01_selectedCharacter');
      localStorage.removeItem('methodica-science-mass-density-01:selectedCharacter');
      localStorage.removeItem('methodica-science-mass-density-01:unitCompleted');
    } catch (e) {}
    return 'cleared';
  };

  /* Seed a state document, for reproducing a resume without walking the unit first.
     __state() dumps one; this puts one back. */
  window.__setState = function (doc) {
    try { sessionStorage.setItem(stateKey(typeof RESUME_STATE_ID !== 'undefined' ? RESUME_STATE_ID : undefined), JSON.stringify(doc)); } catch (e) {}
    return 'seeded';
  };
  /* on may be a boolean (backward compatible) or a numeric status, to reach every reason branch:
     __failWrites(413) for the size cap, (401) for the token, (0) for CORS/network. */
  window.__failWrites = function (on) {
    var v = (on === true) ? '1' : (on === false || on == null) ? '0' : String(on);
    try { sessionStorage.setItem(FAIL_KEY, v); } catch (e) {}
    return 'failWrites=' + v;
  };
  window.__lastState = function () { return window.stateLastResult720(); };

  /* Duplicate 'completed' — the property the ledger exists to guarantee. The key includes the
     part, because the same objectType recurs in every part. 'initialized' is deliberately absent:
     v2.4 §1 / v2.7 REQUIRE it again on every re-entry. */
  window.__dupes = function () {
    var seen = {}, dupes = [];
    readLog().forEach(function (s) {
      if (s.verb !== 'completed') return;
      var k = s.part + '|' + s.objectType + '|' + (s.objectId || '');
      if (seen[k]) dupes.push(k); else seen[k] = 1;
    });
    return dupes;
  };

  /* ── The sweep oracle ────────────────────────────────────────────────────
     Drives goTo() over every data-screen value PRESENT IN THE MARKUP — not 0..TOTAL_SCREENS-1 —
     because this unit's screen ids are neither DOM order nor flow order and a positional loop
     would both miss screens and visit ones that do not exist. Returns a normalised, diffable log. */
  window.__screenIds = function () {
    return Array.prototype.map.call(
      document.querySelectorAll('.screen[data-screen]'),
      function (el) { return parseInt(el.getAttribute('data-screen'), 10); }
    ).sort(function (a, b) { return a - b; });
  };

  function tick() { return new Promise(function (r) { setTimeout(r, 0); }); }

  window.__sweep = async function () {
    var ids = window.__screenIds();
    window.__reset();
    var visited = [];
    for (var i = 0; i < ids.length; i++) {
      var n = ids[i];
      try { goTo(n); }
      catch (e) { visited.push({ screen: n, error: String(e) }); await tick(); continue; }
      visited.push({ screen: n, landed: (typeof currentScreen === 'number') ? currentScreen : null,
                     active: (document.querySelector('.screen.active') || {}).id || null });
      await tick();
    }
    await tick(); await tick();
    return {
      part: currentPart(),
      screenIds: ids,
      total: (typeof TOTAL_SCREENS === 'number') ? TOTAL_SCREENS : null,
      visited: visited,
      statements: readLog()
    };
  };
})();

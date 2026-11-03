#!/usr/bin/env node
/* =====================================================================
   methodica-science-mass-density-01 — asset contract (guide §15.2 / §15.4 step 6)
   Adapted from methodica-science-body-matter-01 _test/verify-assets.js (itself from
   methodica-math-proportion-01) for this unit's layout: each part keeps its own assets/,
   styles.css and script.js at the part root; parts 01 and 02 also load applet/applet*.js and
   applet/applet.css from index.html (they resolve against the part folder); only byte-identical
   files live in unit-assets/, unit-js/, unit-css/.

   Static, no dependencies:   node _test/verify-assets.js
   Exit code 1 on any failure.

   1. every src/href/poster/data-lazy-src in every part's index.html and index_dev.html resolves,
      CASE-EXACT (fs.existsSync is case-insensitive on Windows; the CDN is not)
   2. every CSS url() — in *.css and in <style> blocks — resolves from the STYLESHEET's own folder
      (a part's styles.css and its index.html share the part folder; unit-css/ is one level up)
   3. every asset path written in a part's script.js, applet/*.js and unit-js/*.js resolves from the
      part that loads it; no runtime-built name exists in this unit (a `' +` inside a path fails)
   4. ?v= on every code reference (styles.css, script.js, applet/*, unit-js/*, unit-css/*), one value
      per file across all parts
   5. nothing hoisted grew back: no part file is byte-identical to a unit-* file, and no two parts
      hold byte-identical assets
   6. every path under the parts and unit-* is ASCII, lower-case, space-free
   7. no reference names a folder (the MOE CDN serves a folder URL as 0 bytes)
   8. every file in unit-assets/ is referenced by at least one part; every file in a part's assets/
      or applet/images/ is referenced by its own part
   9. lazy media (unit-js/05-media.js): outside screen 0 no <source src> remains eager and every
      <video>/<audio> carries preload="none"; every part's goTo calls wakeMedia
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const UNIT = 'methodica-science-mass-density-01';
const PARTS = [1, 2, 3, 4, 5, 6, 7].map(n => `${UNIT}-0${n}`);

let fails = 0, checks = 0;
function ok(cond, msg) { checks++; if (!cond) { fails++; console.log('  FAIL ' + msg); } }
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = p => fs.existsSync(path.join(ROOT, p));
const isDir = p => exists(p) && fs.statSync(path.join(ROOT, p)).isDirectory();

/* case-exact: every segment must appear verbatim in its parent's listing */
function resolveExact(rel) {
  const segs = path.normalize(rel).split(path.sep).filter(Boolean);
  if (segs[0] === '..') return false;             // escaped the unit root
  let dir = ROOT;
  for (const s of segs) {
    let names;
    try { names = fs.readdirSync(dir); } catch (e) { return false; }
    if (!names.includes(s)) return false;
    dir = path.join(dir, s);
  }
  return true;
}
const local = u => !/^(https?:|data:|#|mailto:|javascript:|about:|blob:)/.test(u) && u.trim() !== '';
const strip = u => u.split('#')[0].split('?')[0];
const fromDir = (dir, u) => path.posix.normalize(`${dir}/${strip(u)}`);
const walk = (d, out = []) => {
  for (const n of fs.readdirSync(path.join(ROOT, d))) {
    if (['.git', 'node_modules', '_test', 'docs-and-tools', 'metadata', 'scripts', 'deployments'].includes(n)) continue;
    const p = d ? `${d}/${n}` : n;
    if (fs.statSync(path.join(ROOT, p)).isDirectory()) walk(p, out); else out.push(p);
  }
  return out;
};
const ASSET_EXT = /\.(png|jpe?g|gif|svg|mp4|webm|mp3|woff2?)$/i;
const CODE_EXT = /\.(js|css)(\?|$)/;   // documents (index.html) are not cache-busted; code is
const md5 = p => crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, p))).digest('hex');

const versions = {};          // basename → Set of ?v= values
const referenced = new Set(); // every resolved local asset path (unit-relative, posix)
function noteRef(resolved) { referenced.add(resolved); }
function checkCodeVersion(where, u) {
  if (!CODE_EXT.test(u)) return;
  const v = (u.match(/[?&]v=([^&#]+)/) || [])[1];
  ok(!!v, `${where}: no ?v= on ${u}`);
  const key = path.posix.basename(strip(u));
  (versions[key] = versions[key] || new Set()).add(v || '(none)');
}

/* 1 + 4 + 7 + 9 — HTML references */
console.log('HTML references');
const htmlFiles = [];
for (const part of PARTS) for (const f of ['index.html', 'index_dev.html']) if (exists(`${part}/${f}`)) htmlFiles.push(`${part}/${f}`);
for (const html of htmlFiles) {
  const dir = path.posix.dirname(html);
  const src = read(html).replace(/<!--[\s\S]*?-->/g, '');   // prose in comments is not a reference
  for (const m of src.matchAll(/\b(?:src|href|poster|data-lazy-src|xlink:href)\s*=\s*"([^"]+)"/g)) {
    const u = m[1];
    if (!local(u)) continue;
    ok(!/\/(\?|#|$)/.test(u), `${html} → ${u} names a folder, not a file`);
    const r = fromDir(dir, u);
    ok(resolveExact(r), `${html} → ${u}`);
    noteRef(r);
    checkCodeVersion(html, u);
  }
  /* <style> blocks resolve like the document */
  for (const s of src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    for (const m of s[1].matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
      if (!local(m[2])) continue;
      const r = fromDir(dir, m[2]);
      ok(resolveExact(r), `${html} <style> → ${m[2]}`); noteRef(r);
    }
  }
  /* 9 — lazy media outside screen 0 */
  if (html.endsWith('/index.html')) {
    const secs = [...src.matchAll(/<section class="screen"[^>]*data-screen="(\d+)"[^>]*>([\s\S]*?)(?=<section class="screen"|<button id="report-btn"|<!-- \/#app -->|<script src=)/g)];
    ok(secs.length > 1, `${html}: screens found (${secs.length})`);
    for (const [, n, body] of secs) {
      if (n === '0') continue;
      ok(!/<source\b[^>]*\ssrc="/.test(body), `${html} screen ${n}: an eager <source src> (lazy media)`);
      for (const tag of body.match(/<(?:video|audio)\b[^>]*>/g) || []) ok(/preload="none"/.test(tag), `${html} screen ${n}: <video>/<audio> without preload="none"`);
      for (const tag of body.match(/<img\b[^>]*>/g) || []) ok(/\sloading="lazy"/.test(tag), `${html} screen ${n}: <img> without loading="lazy"`);
    }
    ok(/05-media\.js/.test(src), `${html}: loads ../unit-js/05-media.js`);
  }
}
for (const part of PARTS) ok(/wakeMedia\(target\)/.test(read(`${part}/script.js`)), `${part}/script.js: goTo calls wakeMedia(target)`);

/* 2 — CSS url() from the stylesheet's own folder */
console.log('CSS url()');
for (const css of walk('').filter(p => p.endsWith('.css'))) {
  const dir = path.posix.dirname(css);
  for (const m of read(css).matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
    if (!local(m[2])) continue;
    const r = fromDir(dir, m[2]);
    ok(resolveExact(r), `${css} → ${m[2]}`); noteRef(r);
  }
}

/* 3 — asset paths written in JS resolve from the document that loads the script */
console.log('JS asset paths');
const ASSET_RE = /(?:\.\.\/)*(?:unit-assets|assets|applet\/images)\/[A-Za-z0-9_.\/'+ -]*?\.(?:png|jpe?g|gif|svg|mp4|webm|mp3|woff2?)/g;
let jsRefs = 0;
const jsSources = [];
for (const part of PARTS) {
  jsSources.push([part, `${part}/script.js`]);
  if (isDir(`${part}/applet`)) for (const f of fs.readdirSync(path.join(ROOT, part, 'applet'))) if (f.endsWith('.js')) jsSources.push([part, `${part}/applet/${f}`]);
}
if (isDir('unit-js')) for (const f of fs.readdirSync(path.join(ROOT, 'unit-js'))) if (f.endsWith('.js')) for (const part of PARTS) jsSources.push([part, `unit-js/${f}`]);
for (const [dir, file] of jsSources) {
  const src = read(file).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const u of src.match(ASSET_RE) || []) {
    jsRefs++;
    if (u.includes("' +") || u.includes('" +')) { ok(false, `${file} → ${u}: a runtime-built name — list it or do not hoist it`); continue; }
    if (file.startsWith('unit-js/')) ok(u.startsWith('../unit-assets/'), `${file} → ${u}: shared code may only reference ../unit-assets/`);
    const r = fromDir(dir, u); ok(resolveExact(r), `${file} → ${u} (from ${dir})`); noteRef(r);
  }
}
ok(jsRefs >= 15, `reference floor: ${jsRefs} asset paths found in JS (expected ≥ 15; 18 on 2026-11-02)`);

/* 4 — one ?v= per code file across all parts */
console.log('?v= consistency');
const allV = new Set();
for (const [name, vs] of Object.entries(versions)) { ok(vs.size === 1, `one ?v= for ${name} across all parts (found: ${[...vs].join(', ')})`); vs.forEach(v => allV.add(v)); }
ok(allV.size === 1, `one ?v= value for the whole unit (guide §3.4; found: ${[...allV].join(', ')})`);

/* 5 — nothing hoisted grew back, no cross-part duplicates */
console.log('no stale copies');
const allFiles = walk('');
const hoistedHashes = new Map();
for (const f of allFiles.filter(p => /^unit-(assets|js|css)\//.test(p))) hoistedHashes.set(md5(f), f);
const partAssetHashes = new Map();
for (const f of allFiles.filter(p => PARTS.some(part => p.startsWith(part + '/')) && (ASSET_EXT.test(p) || /\.(js|css)$/.test(p)))) {
  const h = md5(f);
  ok(!hoistedHashes.has(h), `${f} is byte-identical to ${hoistedHashes.get(h)} — a hoisted file grew back`);
  if (!ASSET_EXT.test(f)) continue;
  const prev = partAssetHashes.get(h);
  ok(!prev || prev.split('/')[0] === f.split('/')[0], `${f} is byte-identical to ${prev} — hoist it to unit-assets/`);
  if (!prev) partAssetHashes.set(h, f);
}

/* 6 — path hygiene (ASCII, lower-case, no spaces) */
console.log('path hygiene');
for (const f of allFiles) {
  if (!(PARTS.some(part => f.startsWith(part + '/')) || f.startsWith('unit-'))) continue;
  ok(/^[\x21-\x7e]+$/.test(f) && !/[A-Z]/.test(f) && !f.includes(' ') && !f.includes("'"), `${f}: path must be ASCII, lower-case, no spaces`);
}

/* 8 — orphans: every asset is referenced */
console.log('orphans');
for (const f of allFiles.filter(p => ASSET_EXT.test(p) && (p.startsWith('unit-assets/') || PARTS.some(part => p.startsWith(part + '/'))))) {
  ok(referenced.has(f), `${f} is referenced by nothing`);
}

console.log(`\n${checks - fails}/${checks} checks passed` + (fails ? ` — ${fails} FAILED` : ''));
process.exit(fails ? 1 : 0);

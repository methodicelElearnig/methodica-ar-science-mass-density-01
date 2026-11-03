#!/usr/bin/env python3
"""Optimization — re-encode the unit's rasters and videos IN PLACE, keeping every file's type
(PNG stays PNG, JPG stays JPG, GIF stays GIF, WebP stays WebP, MP4 stays MP4), and write one
docs-and-tools/MEDIA-CHANGES.md row per file.

Port of methodica-science-mass-gas-01/docs-and-tools/reencode-media.py (2026-11-01; itself from
mass-liquid-02, 2026-10-22, the same owner decision: keep each file's format). Changes for this unit:
  * 7 parts; assets are found by extension under <part>/assets/, <part>/applet/images/ (the part
    01/02 applets) and unit-assets/
  * KEEP_AUDIO: the part-01 hook video (jordan-river.mp4) is not muted — the producer asked for the
    sound of water (PPTX slide 3 note) — so its AAC track is re-encoded, not stripped; every other
    <video> is muted/decorative and loses its track
  * GIF: ffmpeg palettegen/paletteuse (one palette per clip, 256 colours, bayer dither), frame rate
    and frame count kept, resized only above the 2 x box
  * WebP: Pillow WebP q82 (method 6), alpha kept
  * the boxes table is docs-and-tools/media-display-boxes.json {"boxes": {name: [[w, h], ...]}}

Never shipped (docs-and-tools/ is outside the package). Run from the unit root:

    python -I docs-and-tools/reencode-media.py images [--dry-run] [--only NAME ...]
    python -I docs-and-tools/reencode-media.py videos [--dry-run] [--only NAME ...]

Rules (guide §15):
  * target size = 2 x the largest box the file is drawn in (object-fit: cover assumed — the
    conservative reading), never upscaled; a shrink below 10 % is not worth a resample
  * PNG: LANCZOS resize -> libimagequant 256-colour palette (dithered, alpha kept, quality floor
    70 — an image that cannot reach it stays 24-bit) -> oxipng -o4 --strip safe
  * JPG: LANCZOS resize -> Pillow quality 82, progressive, optimize, EXIF dropped
  * MP4: ffmpeg libx264 crf 26 preset slow yuv420p +faststart, audio stripped except KEEP_AUDIO
    (aac 96k), lanczos downscale to the 2 x box (even dimensions), fps kept
  * an output larger than its input is discarded (the row says "kept (no gain)")
  * SVG and fonts are never touched
"""
import json, shutil, subprocess, sys, tempfile
from pathlib import Path

from PIL import Image, ImageOps
import imagequant

ROOT = Path(__file__).resolve().parent.parent
UNIT = 'methodica-science-mass-density-01'
PARTS = [f'{UNIT}-0{n}' for n in range(1, 8)]
KEEP_AUDIO = {'jordan-river.mp4'}
BOXES = json.loads((ROOT / 'docs-and-tools' / 'media-display-boxes.json').read_text('utf-8'))['boxes']
ROWS_OUT = ROOT / 'docs-and-tools' / 'reencode-rows.md'

PNG_MIN_Q, PNG_MAX_Q, JPG_Q, WEBP_Q, X264_CRF = 70, 95, 82, 82, 26
MIN_SHRINK = 0.90
IMG_EXT = {'.png', '.jpg', '.jpeg', '.gif', '.webp'}
VID_EXT = {'.mp4'}


def asset_files(exts):
    out = []
    for p in [ROOT / part / 'assets' for part in PARTS] + [ROOT / part / 'applet' / 'images' for part in PARTS] + [ROOT / 'unit-assets']:
        if p.is_dir():
            out += sorted(x for x in p.rglob('*') if x.is_file() and x.suffix.lower() in exts)
    return out


def target_scale(name, nat_w, nat_h):
    boxes = BOXES.get(name)
    if not boxes:
        return 1.0, None
    s = max(max(bw / nat_w, bh / nat_h) for bw, bh in boxes)
    return min(1.0, 2.0 * s), max(boxes, key=lambda b: b[0] * b[1])


def even(n):
    return int(n) - (int(n) % 2)


def rel(p):
    return p.relative_to(ROOT).as_posix()


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        raise RuntimeError(f'{cmd[0]} failed: {r.stderr[-800:]}')
    return r.stdout


def gif_frames(f):
    j = json.loads(run(['ffprobe', '-v', 'error', '-count_frames', '-print_format', 'json', '-show_streams', str(f)]))
    v = j['streams'][0]
    return int(v.get('nb_read_frames', 0)), v.get('r_frame_rate')


def do_images(dry, only):
    rows, saved = [], 0
    for f in asset_files(IMG_EXT):
        if only and f.name not in only:
            continue
        before = f.stat().st_size
        im = Image.open(f)
        nat = im.size
        scale, box = target_scale(f.name, *nat)
        new = (max(1, round(nat[0] * scale)), max(1, round(nat[1] * scale))) if scale < MIN_SHRINK else nat
        ops, params = (['resize'], [f'LANCZOS {nat[0]}x{nat[1]} -> {new[0]}x{new[1]} (2 x box {box[0]}x{box[1]})']) if new != nat else ([], [])
        tmpdir = Path(tempfile.mkdtemp())
        out = tmpdir / f.name
        ext = f.suffix.lower()
        if ext == '.gif':
            fr_before = gif_frames(f)
            sc = f'scale={even(new[0])}:{even(new[1])}:flags=lanczos,' if new != nat else ''
            run(['ffmpeg', '-v', 'error', '-y', '-i', str(f), '-filter_complex',
                 f'[0:v]{sc}split[a][b];[a]palettegen=max_colors=256:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle',
                 '-loop', '0', str(out)])
            fr_after = gif_frames(out)
            ops.append('reencode'); params.append(f'ffmpeg palettegen(diff)/paletteuse(bayer 3); frames {fr_before[0]} -> {fr_after[0]} @ {fr_after[1]}')
            if fr_after[0] != fr_before[0]:
                params.append('FRAME COUNT CHANGED: discarded'); out.write_bytes(f.read_bytes())
        else:
            im.load()
            work = ImageOps.exif_transpose(im).resize(new, Image.LANCZOS) if new != nat else im
            if ext == '.png':
                rgba = work.convert('RGBA')
                try:
                    q = imagequant.quantize_pil_image(rgba, dithering_level=1.0, max_colors=256, min_quality=PNG_MIN_Q, max_quality=PNG_MAX_Q)
                    q.save(out, 'PNG', optimize=True)
                    ops.append('quantize'); params.append(f'libimagequant 256 colours, dither 1.0, quality {PNG_MIN_Q}-{PNG_MAX_Q}')
                except RuntimeError:
                    (rgba if im.mode in ('RGBA', 'LA', 'P') else work.convert('RGB')).save(out, 'PNG', optimize=True)
                    params.append(f'palette refused below quality {PNG_MIN_Q}: kept 24-bit')
                run(['oxipng', '-o', '4', '--strip', 'safe', '-q', str(out)])
                params.append('oxipng -o4 --strip safe')
            elif ext == '.webp':
                work.save(out, 'WEBP', quality=WEBP_Q, method=6)
                ops.append('reencode'); params.append(f'Pillow WebP q{WEBP_Q} method 6')
            else:
                work.convert('RGB').save(out, 'JPEG', quality=JPG_Q, optimize=True, progressive=True)
                ops.append('reencode'); params.append(f'Pillow JPEG q{JPG_Q} progressive optimize, EXIF dropped')
        im.close()
        after = out.stat().st_size
        op = '+'.join(ops) if ops else 'reencode'
        if after >= before:
            verdict, after_eff = 'kept (no gain)', before
        else:
            verdict, after_eff = 'written', after
            if not dry:
                shutil.copyfile(out, f)
        shutil.rmtree(tmpdir, ignore_errors=True)
        saved += before - after_eff
        boxtxt = f'{box[0]}x{box[1]}' if box else 'not measured: native kept'
        rows.append(f'| {op} | `{rel(f)}` | {before:,} | {after_eff:,} | {nat[0]}x{nat[1]} | {new[0]}x{new[1]} | {boxtxt} | {"; ".join(params)} | {verdict} |')
        print(f'{rel(f):80} {before:>10,} -> {after_eff:>10,}  {op:18} {verdict}')
    ROWS_OUT.write_text('\n'.join(rows) + '\n', 'utf-8')
    print(f'\n{len(rows)} files, {saved:,} bytes saved{" (dry run — nothing written)" if dry else ""}; rows -> {rel(ROWS_OUT)}')


def probe(f):
    j = json.loads(run(['ffprobe', '-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', str(f)]))
    v = next(s for s in j['streams'] if s['codec_type'] == 'video')
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    num, den = v['r_frame_rate'].split('/')
    return int(v['width']), int(v['height']), round(int(num) / int(den), 3), float(j['format']['duration']), bool(a), int(j['format'].get('bit_rate', 0))


def do_videos(dry, only):
    rows, saved = [], 0
    for f in asset_files(VID_EXT):
        if only and f.name not in only:
            continue
        before = f.stat().st_size
        w, h, fps, dur, audio, br = probe(f)
        s, box = target_scale(f.name, w, h)
        tw, th = (even(w * s), even(h * s)) if s < MIN_SHRINK else (w, h)
        tmpdir = Path(tempfile.mkdtemp()); out = tmpdir / f.name
        vf = ['-vf', f'scale={tw}:{th}:flags=lanczos'] if (tw, th) != (w, h) else []
        aud = ['-c:a', 'aac', '-b:a', '96k'] if f.name in KEEP_AUDIO else ['-an']
        run(['ffmpeg', '-v', 'error', '-y', '-i', str(f)] + aud + ['-c:v', 'libx264', '-crf', str(X264_CRF), '-preset', 'slow',
             '-pix_fmt', 'yuv420p', '-movflags', '+faststart'] + vf + [str(out)])
        after = out.stat().st_size
        w2, h2, fps2, dur2, audio2, br2 = probe(out)
        if after >= before:
            verdict, after_eff = 'kept (no gain)', before
        else:
            verdict, after_eff = 'written', after
            if not dry:
                shutil.copyfile(out, f)
        shutil.rmtree(tmpdir, ignore_errors=True)
        saved += before - after_eff
        params = f'libx264 crf {X264_CRF} slow yuv420p +faststart ' + ('aac 96k (KEEP_AUDIO)' if f.name in KEEP_AUDIO else '-an') + (f' scale={tw}:{th} lanczos' if vf else '')
        boxtxt = f'{box[0]}x{box[1]}' if box else 'not measured: native kept'
        rows.append(f'| reencode | `{rel(f)}` | {before:,} | {after_eff:,} | {w}x{h} {fps}fps {dur:.2f}s {"audio" if audio else "no audio"} {br // 1000}kb/s | {w2}x{h2} {fps2}fps {dur2:.2f}s {br2 // 1000}kb/s | {boxtxt} | {params} | {verdict} |')
        print(f'{rel(f):80} {before:>10,} -> {after_eff:>10,}  {w}x{h}->{w2}x{h2} {verdict}')
    ROWS_OUT.write_text('\n'.join(rows) + '\n', 'utf-8')
    print(f'\n{len(rows)} files, {saved:,} bytes saved{" (dry run — nothing written)" if dry else ""}; rows -> {rel(ROWS_OUT)}')


if __name__ == '__main__':
    args = sys.argv[1:]
    if not args or args[0] not in ('images', 'videos'):
        sys.exit(__doc__)
    dry = '--dry-run' in args
    only = set(args[args.index('--only') + 1:]) if '--only' in args else set()
    only.discard('--dry-run')
    (do_images if args[0] == 'images' else do_videos)(dry, only)

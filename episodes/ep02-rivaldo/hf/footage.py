#!/usr/bin/env python3
"""Archive footage inserts for Episode 2 (broadcast clips, muted; our score and SFX play under them).

Each insert is pre-rendered to its exact length so HyperFrames only has to play it: pieces are cut from the
sources, slow-motion pieces are optical-flow interpolated (ffmpeg minterpolate, 120 fps) and sampled through a
time map (speed ramps, freezes), reframed to 4:5 with a moving crop (DS: re-layout, never letterbox), upscaled
(Lanczos + light unsharp) and given the act grade with the same CSS maths as the stills (darkroom.py), with the
saturation lifted +0.3 so the play keeps its colour.
Timings come from ../audio/line_timings_edit.json, so the inserts follow any retime.
Writes assets/footage/<name>.mp4 and assets/footage/manifest.json (read by build.py, sound.py, score.py).
Sources (not in git): assets/footage/src/clip1.mp4 (fan edit, 3:4, burned caption → delogo),
                      assets/footage/src/clip2.mp4 (compilation, 9:16 with letterboxed shots).
"""
import json, os, subprocess, sys, numpy as np
from collections import Counter
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE)
OUT = f'{HERE}/assets/footage'; SRC = {'c1': f'{OUT}/src/clip1.mp4', 'c2': f'{OUT}/src/clip2.mp4'}
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
ls = lambda i: L[i]['start']; le = lambda i: L[i]['end']
W, H, FPS = 1080, 1350, 30
def span(a, b):          # same scene windows as build.py
    t0 = 0.0 if a == 0 else ls(a) - 0.25
    return round(t0, 3), round(ls(b + 1) - 0.25 + 0.3, 3)

HEX = {'gold500': '#C8A86E', 'gold700': '#86693A', 'stone300': '#9D958A', 'stone200': '#CAC3B7', 'white200': '#EAE3D6'}
ACT = {  # act: (saturate, sepia, grade colour, grade alpha)  — build.py ACTS
    'cold': (0.85, 0.14, 'gold500', 0.09), 'I': (0.10, 0.06, 'stone300', 0.10), 'III': (0.55, 0.06, 'white200', 0.05),
    'VI': (0.95, 0.04, 'white200', 0.04), 'EP': (0.85, 0.10, 'gold500', 0.09)}
LIFT = 0.30

def P(src, a, b=None, dur=None, cx=0.5, cy=0.5, zoom=1.0, tmap=None, sat=None):
    """A piece. cx/cy/zoom: a number or [(τ, value), …] with τ in seconds from the piece start.
    tmap: [(τ, source_time), …] (speed ramps/freezes); sat: optional [(τ, saturation)] override."""
    return dict(src=src, a=a, b=b, dur=dur, cx=cx, cy=cy, zoom=zoom, tmap=tmap, sat=sat)

def build_spec():
    S = {}
    t1 = span(0, 3)[1]
    S['open_a'] = dict(act='cold', host='s01', mode='over', start=0.0, end=le(0) + 0.05, fin=0.0, fout=0.25, pieces=[
        P('c2', 11.97, 12.60, dur=1.05, zoom=[(0, 1.0), (1.05, 1.04)]),                       # «RIVALDO» on his back, Camp Nou
        P('c2', 12.66, 14.58, zoom=[(0, 1.0), (2.0, 1.05)])],                                  # Ballon d'Or presented on the pitch
        events=[('applause', 1.1)])
    fb = ls(2) - 0.18; run = 2.4
    S['open_b'] = dict(act='cold', host='s01', mode='over', start=fb, end=t1, fin=0.12, fout=0.0, pieces=[
        P('c2', 37.00, 39.30, dur=run, zoom=[(0, 1.0), (run, 1.03)]),                          # dribble through the box, round the keeper…
        P('c2', 39.30, 39.30, zoom=[(0, 1.03), (2.4, 1.13)], sat=[(0, 1.0), (0.15, 1.0), (1.1, 0.06)])],  # …freeze before the goal, drains to grey: «الدكة»
        events=[('goal', 1.5), ('freeze', run)])
    a0, a1 = span(47, 51)
    S['showA'] = dict(act='III', host='s12', mode='under', start=a0, end=a1, fin=0.25, fout=0.0, pieces=[
        P('c2', 17.40, 21.95),                                                                 # slalom and finish
        P('c2', 14.70, 17.30, cx=[(0, 0.42), (2.6, 0.6)]),                                     # from distance
        P('c2', 26.65, 29.00),                                                                 # UCL: through and in
        P('c2', 33.95, 35.90),                                                                 # dribble
        P('c2', 46.95, 48.95),                                                                 # finish
        P('c2', 30.65, None)],                                                                 # long range (fills the rest)
        events=[('goal', 4.2), ('goal', 6.05), ('goal', 8.9), ('goal', 12.9)])
    b0 = ls(79) - 0.2
    S['montB'] = dict(act='VI', host='s19', mode='over', start=b0, end=ls(81) - 0.6, fin=0.2, fout=0.55, pieces=[
        P('c2', 0.15, 2.25, cx=0.56),                                                          # night dribble, Nº10
        P('c1', 11.55, 12.25), P('c1', 20.85, 21.55), P('c1', 23.55, 24.25),                   # three finishes
        P('c2', 50.45, 52.45),                                                                 # round the keeper
        P('c1', 57.20, None)],                                                                 # free kick, Nº10
        events=[('goal', 5.65), ('goal', 8.15)])
    net = 56.25; g0 = ls(95) - (net - 53.92)
    S['goal2'] = dict(act='VI', host='s20', mode='over', start=g0, end=g0 + 3.13, fin=0.12, fout=0.2, pieces=[
        P('c2', 53.92, 57.05, cx=[(0, 0.42), (2.2, 0.62), (3.13, 0.6)])], events=[])          # 17·6·2001: the 2-1 from distance
    k0, k1 = ls(104) - 0.14, span(102, 111)[1]
    A = [(k0, 57.10), (ls(106) - 0.16, 57.95), (le(106), 58.42), (ls(107) - 0.05, 58.45), (ls(107) + 0.18, 58.50), (ls(107) + 0.50, 58.62),
         (ls(108) + 0.03, 59.30), (ls(108) + 1.53, 59.92), (k1, 59.92)]
    rel = lambda pts: [(round(t - k0, 3), v) for t, v in pts]
    S['kick'] = dict(act='VI', host='s21', mode='under', start=k0, end=k1, fin=0.12, fout=0.0, pieces=[
        P('c2', 57.10, 59.92, dur=k1 - k0, tmap=rel(A),
          zoom=rel([(k0, 1.0), (le(106), 1.06), (ls(107) - 0.05, 1.10), (ls(107) + 0.03, 1.0), (ls(108) + 1.53, 1.0), (k1, 1.10)]),
          cx=rel([(k0, 0.60), (ls(107), 0.55), (ls(108), 0.46), (k1, 0.5)]))], events=[])     # chest · air · overhead · goal
    r0, r1 = ls(115) - 0.02, le(115) - 0.05
    S['replay'] = dict(act='VI', host='s22', mode='over', start=r0, end=r1, fin=0.15, fout=0.25, pieces=[
        P('c2', 58.10, 59.90, zoom=[(0, 1.04), (2.6, 1.0)], cx=0.5)], events=[('goal', (59.30 - 58.10) * (r1 - r0) / 1.8)])
    S['recap_bdo'] = dict(act='EP', host='s25', mode='over', start=ls(127) + 0.05, end=le(127) - 0.05, fin=0.15, fout=0.2,
                          pieces=[P('c2', 12.66, 14.58)], events=[])
    q0 = ls(128) + 0.1
    S['recap_kick'] = dict(act='EP', host='s25', mode='over', start=q0, end=q0 + 2.82, fin=0.15, fout=0.25,
                           pieces=[P('c2', 57.10, 59.92, cx=0.52)], events=[('goal', 2.2)])
    return S

# ------------------------------------------------------------------ helpers
def interp(v, t):
    if not isinstance(v, list): return v
    if t <= v[0][0]: return v[0][1]
    for (t0, a), (t1, b) in zip(v, v[1:]):
        if t <= t1:
            u = (t - t0) / max(1e-9, t1 - t0); u = u * u * (3 - 2 * u)      # smoothstep between keys
            return a + (b - a) * u
    return v[-1][1]
def lin(v, t):
    if t <= v[0][0]: return v[0][1]
    for (t0, a), (t1, b) in zip(v, v[1:]):
        if t <= t1: return a + (b - a) * (t - t0) / max(1e-9, t1 - t0)
    return v[-1][1]

def active_box(src, a, b):
    if src == 'c1': return (0, 0, 576, 768)
    r = subprocess.run(['ffmpeg', '-hide_banner', '-ss', f'{a:.3f}', '-to', f'{max(b, a + 0.1):.3f}', '-i', SRC[src],
                        '-vf', 'cropdetect=limit=24:round=2:reset=1', '-f', 'null', '-'], capture_output=True, text=True).stderr
    crops = [l.split('crop=')[1].strip() for l in r.splitlines() if 'crop=' in l]
    w, h, x, y = map(int, Counter(crops).most_common(1)[0][0].split(':'))
    return (x, y, w, h)

def decode(src, a, b, box, fps_i):
    x, y, w, h = box
    vf = ('delogo=x=198:y=370:w=182:h=28,' if src == 'c1' else '') + f'crop={w}:{h}:{x}:{y},hqdn3d=1.5:1.5:3:3'
    if fps_i != 30: vf += f',minterpolate=fps={fps_i}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1'
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', f'{a:.3f}', '-to', f'{b + 0.05:.3f}', '-i', SRC[src], '-vf', vf,
                          '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w, 3)

def css_sat(s):
    return np.array([[.213 + .787 * s, .715 - .715 * s, .072 - .072 * s],
                     [.213 - .213 * s, .715 + .285 * s, .072 - .072 * s],
                     [.213 - .213 * s, .715 - .715 * s, .072 + .928 * s]], np.float32)
def css_sep(a):
    return np.array([[.393 + .607 * (1 - a), .769 - .769 * (1 - a), .189 - .189 * (1 - a)],
                     [.349 - .349 * (1 - a), .686 + .314 * (1 - a), .168 - .168 * (1 - a)],
                     [.272 - .272 * (1 - a), .534 - .534 * (1 - a), .131 + .869 * (1 - a)]], np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
cxv, cyv = W * .5, H * .45
dv = np.sqrt(((xx - cxv) / (np.sqrt(2) * cxv)) ** 2 + ((yy - cyv) / (np.sqrt(2) * max(cyv, H - cyv))) ** 2)
VIG = (1 - np.clip((dv - .42) / .58, 0, 1) * .78)[..., None].astype(np.float32)
def grade(img, sat, sep, col, alpha):
    g = img.astype(np.float32) / 255.0
    g = np.clip(g @ css_sat(sat).T, 0, 1); g = np.clip(g @ css_sep(sep).T, 0, 1)
    g = np.clip((g - .5) * 1.04 + .5, 0, 1)
    c = np.array([int(HEX[col][i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
    d = np.where(g <= .25, ((16 * g - 12) * g + 4) * g, np.sqrt(g))
    sl = np.where(c <= .5, g - (1 - 2 * c) * g * (1 - g), g + (2 * c - 1) * (d - g))
    g = (g * (1 - alpha) + sl * alpha) * VIG
    return (np.clip(g, 0, 1) * 255 + 0.5).astype(np.uint8)

def plan(ins):
    """[(piece, frames, first frame)] with the open-ended last piece resolved; and the total frame count."""
    total = ins['end'] - ins['start']; n_total = int(round(total * FPS))
    fixed = sum(p['dur'] if p['dur'] else (p['b'] - p['a']) for p in ins['pieces'] if p['b'] is not None)
    out, done = [], 0
    for pi, p in enumerate(ins['pieces']):
        if p['b'] is None: p = dict(p, b=p['a'] + (total - fixed))
        n = (n_total - done) if pi == len(ins['pieces']) - 1 else int(round((p['dur'] or (p['b'] - p['a'])) * FPS))
        out.append((p, n, done)); done += n
    return out, n_total

def render(name, ins):
    act_sat, sep, col, alpha = ACT[ins['act']]
    pieces, n_total = plan(ins)
    out = f'{OUT}/{name}.mp4'
    ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS),
                           '-i', '-', '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p',
                           '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out], stdin=subprocess.PIPE)
    sharpen = ImageFilter.UnsharpMask(radius=1.6, percent=50, threshold=2)
    for p, n, done in pieces:
        dur = n / FPS
        speed = (p['b'] - p['a']) / dur if p['b'] > p['a'] else 0.0
        tm = p['tmap']
        if tm: speeds = [(b2 - b1) / max(1e-9, t2 - t1) for (t1, b1), (t2, b2) in zip(tm, tm[1:]) if b2 > b1]; slow = min(speeds) < 0.8
        else: slow = 0 < speed < 0.8
        fps_i = 120 if slow else 30
        box = active_box(p['src'], p['a'], max(p['b'], p['a'] + 0.2))
        frames = decode(p['src'], p['a'], max(p['b'], p['a'] + 0.04), box, fps_i)
        bw, bh = box[2], box[3]
        cw0, ch0 = (bh * 0.8, bh) if bw / bh > 0.8 else (bw, bw / 0.8)
        for k in range(n):
            tau = k / FPS
            st = lin(tm, tau) if tm else p['a'] + tau * speed
            fi = int(np.clip(round((st - p['a']) * fps_i), 0, len(frames) - 1))
            z = interp(p['zoom'], tau); cw, ch = cw0 / z, ch0 / z
            x0 = float(np.clip(interp(p['cx'], tau) * bw - cw / 2, 0, bw - cw))
            y0 = float(np.clip(interp(p['cy'], tau) * bh - ch / 2, 0, bh - ch))
            im = Image.fromarray(frames[fi]).resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch)).filter(sharpen)
            s = min(1.0, act_sat + LIFT) if p['sat'] is None else interp(p['sat'], tau)
            ff.stdin.write(grade(np.asarray(im), s, sep, col, alpha).tobytes())
        print(f'  {name}: {p["src"]} {p["a"]:.2f}–{p["b"]:.2f} → {dur:.2f}s @ {fps_i} fps, box {box}', flush=True)
    ff.stdin.close(); ff.wait()
    return n_total / FPS

if __name__ == '__main__':
    spec = build_spec(); args = sys.argv[1:]
    manifest_only = '--manifest' in args; only = [a for a in args if not a.startswith('--')]
    man_path = f'{OUT}/manifest.json'
    man = json.load(open(man_path)) if os.path.exists(man_path) else {}
    for name, ins in spec.items():
        if not manifest_only and only and name not in only: continue
        if not manifest_only: render(name, ins)
        pieces, n_total = plan(ins)
        cuts = [['cut', round(ins['start'] + d / FPS, 3)] for p, n, d in pieces[1:] if p['b'] > p['a']]
        man[name] = dict(src=f'assets/footage/{name}.mp4', start=round(ins['start'], 3), dur=round(n_total / FPS, 3), host=ins['host'],
                         mode=ins['mode'], fin=ins['fin'], fout=ins['fout'],
                         events=[[k, round(ins['start'] + t, 3)] for k, t in ins.get('events', [])] + cuts)
        json.dump(man, open(man_path, 'w'), indent=1)
    print('manifest:', {k: (v['start'], v['dur']) for k, v in man.items()})

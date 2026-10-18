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
                      assets/footage/src/clip2.mp4 (compilation, 9:16 with letterboxed shots),
                      assets/footage/src/clip3.mp4 (1:1 compilation opening with an early-1990s TV Globo report on the
                      young Rivaldo; a page logo sits top-left, so those shots are framed to its right).
"""
import json, os, subprocess, sys, numpy as np
from collections import Counter
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE)
OUT = f'{HERE}/assets/footage'; SRC = {'c1': f'{OUT}/src/clip1.mp4', 'c2': f'{OUT}/src/clip2.mp4', 'c3': f'{OUT}/src/clip3.mp4',
                                       'c4': f'{OUT}/src/clip4.mp4',
                                       'c5': f'{OUT}/src/clip5.mp4'}   # c5: Barça–Valencia 17·6·2001 broadcast (60 fps); title box at the top is framed out   # c4: 'through the years' slideshow, 9:16, burned-in years (framed out)
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
ls = lambda i: L[i]['start']; le = lambda i: L[i]['end']
W, H, FPS = 1080, 1350, 30
def span(a, b):          # same scene windows as build.py
    t0 = 0.0 if a == 0 else ls(a) - 0.25
    return round(t0, 3), round(ls(b + 1) - 0.25 + 0.3, 3)

HEX = {'gold500': '#C8A86E', 'gold700': '#86693A', 'stone300': '#9D958A', 'stone200': '#CAC3B7', 'white200': '#EAE3D6'}
ACT = {  # act: (saturate, sepia, grade colour, grade alpha)  — build.py ACTS
    'cold': (0.85, 0.14, 'gold500', 0.09), 'I': (0.10, 0.06, 'stone300', 0.10), 'II': (0.35, 0.14, 'gold700', 0.08), 'III': (0.55, 0.06, 'white200', 0.05),
    'V': (0.30, 0.06, 'stone300', 0.08), 'VI': (0.95, 0.04, 'white200', 0.04), 'VII': (0.70, 0.08, 'stone200', 0.06), 'EP': (0.85, 0.10, 'gold500', 0.09)}
LIFT = 0.30

def P(src, a, b=None, dur=None, cx=0.5, cy=0.5, zoom=1.0, tmap=None, sat=None, box=None):
    """A piece. cx/cy/zoom: a number or [(τ, value), …] with τ in seconds from the piece start.
    tmap: [(τ, source_time), …] (speed ramps/freezes); sat: optional [(τ, saturation)] override."""
    return dict(src=src, a=a, b=b, dur=dur, cx=cx, cy=cy, zoom=zoom, tmap=tmap, sat=sat, box=box)

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
    r0, r1 = span(4, 7)[0], ls(6) + 0.85      # ends as the year counter passes 1993: the 1980s run on black
    S['rewind'] = dict(act='I', host='s02', mode='under', start=r0, end=r1, fin=0.25, fout=0.5, pieces=[
        P('c4', 7.00, 15.60, dur=r1 - r0, box=(0, 0, 576, 1024), zoom=1.125, cy=0.33,
          tmap=[(0, 15.6), (r1 - r0, 7.0)], sat=[(0, 0.9), (r1 - r0, 0.08)])], events=[])               # 2001 → 1995, colour drains
    S['young_quit'] = dict(act='I', host='s07', mode='over', start=ls(27) - 0.1, end=ls(29) - 0.3, fin=0.5, fout=0.6, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 14.05, 15.20, dur=ls(29) - 0.3 - (ls(27) - 0.1), zoom=[(0, 1.3), (4.4, 1.4)], cx=0.66,
                  tmap=[(0, 14.05), (2.9, 15.2), (ls(29) - 0.3 - (ls(27) - 0.1), 15.2)],
                  sat=[(0, 0.3), (2.0, 0.05)])], events=[])                                                   # «قرر يسيب الكورة»: alone at home
    # Act VII, World Cup 2002 (fifaworldcup.com / Avaya / NTT / Yahoo boards): a Rivaldo goal, then him and Ronaldo celebrating
    b0 = span(116, 121)[0] + 0.3   # 2002 group/knockout goal, then the celebration photo on «صيف 2002.»; the final keeps its own photo
    S['bra_goal'] = dict(act='VII', host='s23', mode='under', start=b0, end=b0 + 3.7, fin=0.2, fout=0.0,
        pieces=[P('c1', 7.10, 10.80, cx=0.5)], events=[('goal', 3.35)])                                       # a 2002 World Cup goal
    c0, c1_ = ls(121) - 0.1, span(116, 121)[1]
    S['bra_celeb'] = dict(act='VII', host='s23', mode='over', start=c0, end=c1_, fin=0.15, fout=0.0,
        pieces=[P('c3', 16.36, 17.15, dur=c1_ - c0, zoom=[(0, 1.3), (c1_ - c0, 1.37)], cx=0.6, cy=0.5,          # framed right of the page logo
                  tmap=[(0, 16.36), (1.6, 17.15), (c1_ - c0, 17.15)])], events=[('applause', 0.1)])            # «وريفالدو يبقى بطل عالم»
    # wide match pictures under the type plates of the Valencia night (dimmed via 'op'), so no plate sits on black
    f0, f1 = ls(81) - 0.9, span(79, 87)[1]          # from the end of the montage (montB ends at ls(81) - 0.6)
    S['val_pre'] = dict(act='VI', host='s19', mode='under', start=f0, end=f1, fin=0.3, fout=0.0, op=0.45,
        pieces=[P('c5', 0.00, 4.30), P('c5', 29.00, 30.50), P('c5', 60.50, 62.40), P('c5', 85.00, 86.60),
                P('c5', 93.50, 95.30), P('c5', 113.50, None)], events=[])                                       # «17 يونيو 2001… الحسبة بسيطة»
    g0_, g1_ = span(88, 101)
    S['val_bg'] = dict(act='VI', host='s20', mode='under', start=g0_, end=g1_, fin=0.3, fout=0.0, op=0.4,
        pieces=[P('c5', 101.0, 104.6, dur=7.2), P('c5', 47.6, 52.3, dur=9.4), P('c5', 64.0, 67.0), P('c5', 116.6, None)], events=[])  # (c5 68–70 is the 2-1: kept out)  # under the scoreboard (half speed)
    e0 = span(102, 111)[0]
    S['val_87'] = dict(act='VI', host='s21', mode='under', start=e0, end=ls(103) - 0.08, fin=0.3, fout=0.0, op=0.45,
        pieces=[P('c5', 17.00, 17.95, dur=ls(103) - 0.08 - e0)], events=[])                                       # «الدقيقة 87»
    h0 = span(130, 132)[0]
    S['title_clip'] = dict(act='EP', host='s26', mode='under', start=h0, end=ls(132) + 0.1, fin=0.3, fout=0.0,
        pieces=[P('c3', 26.50, 27.36, dur=ls(132) + 0.1 - h0, zoom=1.25, cx=0.62)], events=[])                  # shirt over his head (framed right of the logo)
    # Act V, the Van Gaal dispute: B-roll from the c5 broadcast (no date or claim on screen)
    S['vg_wing'] = dict(act='V', host='s18', mode='over', start=ls(70) - 0.15, end=ls(71) - 0.25, fin=0.2, fout=0.25,
        pieces=[P('c5', 52.40, 54.95, cx=[(0, 0.45), (2.7, 0.55)])], events=[])                                # «يلعب على الجناح الشمال»
    S['vg_sit'] = dict(act='V', host='s18', mode='over', start=ls(76) - 0.1, end=le(77) + 0.2, fin=0.3, fout=0.35,
        pieces=[P('c5', 8.90, 9.95, dur=le(77) + 0.3 - ls(76), zoom=[(0, 1.0), (4.8, 1.08)], cx=0.55,
                  sat=[(0, 0.6), (4.8, 0.3)])], events=[])                                                          # alone on the grass: «استبعد…»
    # the Valencia night, 17 June 2001 (broadcast, c5)
    K0 = ls(104) - 0.14                                     # the bicycle-kick insert starts here
    fk0 = (ls(90) + 0.55) - (1.55 + 0.50)                   # strike lands on the SFX kick inside «ضربة حرة مباشرة»
    S['val_skill'] = dict(act='VI', host='s20', mode='over', start=ls(88) - 0.15, end=fk0, fin=0.2, fout=0.0,
        pieces=[P('c5', 4.75, 7.95, dur=fk0 - (ls(88) - 0.15), zoom=[(0, 1.0), (4.3, 1.05)], cx=0.5)], events=[])  # the dribble
    S['val_fk'] = dict(act='VI', host='s20', mode='over', start=fk0, end=ls(91) - 0.05, fin=0.0, fout=0.12,
        pieces=[P('c5', 18.05, 19.60, cx=0.42), P('c5', 20.10, None, cx=0.55)], events=[])                         # 1-0, free kick
    S['val_eq1'] = dict(act='VI', host='s20', mode='over', start=ls(92) - 0.05, end=le(92) + 0.15, fin=0.1, fout=0.12,
        pieces=[P('c5', 44.00, 45.25, dur=le(92) + 0.2 - ls(92), cx=0.5)], events=[])                             # «فالنسيا يتعادل»: Valencia celebrate
    S['val_cross'] = dict(act='VI', host='s21', mode='over', start=ls(103) - 0.08, end=K0, fin=0.15, fout=0.0,
        pieces=[P('c5', 133.05, 134.25, dur=K0 - (ls(103) - 0.08), cx=0.5)], events=[])                          # the box waits for De Boer's ball
    S['val_after'] = dict(act='VI', host='s21', mode='under', start=ls(109) + 0.25, end=span(102, 111)[1], fin=0.25, fout=0.0,
        pieces=[P('c5', 131.15, 132.85, dur=span(102, 111)[1] - (ls(109) + 0.25), cx=0.5)], events=[])         # the bench runs on
    S['leave'] = dict(act='EP', host='s24', mode='over', start=ls(124) - 0.15, end=span(122, 124)[1], fin=0.25, fout=0.3,
        pieces=[P('c5', 147.85, 149.95, dur=span(122, 124)[1] - (ls(124) - 0.15), cx=0.27,
                  sat=[(0, 0.7), (3.0, 0.25)])], events=[])                                                      # «قرر يرحل»: he walks away
    S['val_down'] = dict(act='VI', host='s20', mode='over', start=ls(97) - 0.1, end=ls(98) - 0.1, fin=0.12, fout=0.12,
        pieces=[P('c5', 90.30, 91.60, dur=ls(98) - ls(97), cx=0.5)], events=[])                                   # «فالنسيا يتعادل من جديد»
    S['val_tense'] = dict(act='VI', host='s20', mode='over', start=ls(99) - 0.1, end=le(99) + 0.15, fin=0.12, fout=0.15,
        pieces=[P('c5', 111.72, 112.60, dur=le(99) + 0.25 - ls(99), cx=0.5)], events=[])                         # «والوقت بيخلص»
    # (c5 121.6–126.9 is the 2-1 from the live wide camera, not De Boer's ball: the kick's build-up stays a still)
    S['val_bench'] = dict(act='VI', host='s22', mode='over', start=ls(112) - 0.1, end=le(112) + 0.2, fin=0.15, fout=0.0,
        pieces=[P('c5', 139.45, 140.30, cx=0.5), P('c5', 127.20, None, cx=0.5)], events=[('applause', 0.05)])     # «الكامب نو انفجر»
    S['val_shirt'] = dict(act='VI', host='s22', mode='over', start=le(112) + 0.2, end=ls(115) - 0.05, fin=0.0, fout=0.15,
        pieces=[P('c5', 129.00, 129.85, cx=0.5), P('c5', 140.55, 141.95, cx=0.5), P('c5', 142.95, None, cx=0.5)], events=[('goal', 0.3)])          # shirt off, the hugs
    a0, a1 = span(47, 51)
    # Act I: the TV Globo report on the young Rivaldo (early 1990s), framed right of the page logo (Z = 1.25, cx ≥ 0.61)
    YZ, YX = 1.25, 0.63
    S['young_hood'] = dict(act='I', host='s03', mode='over', start=ls(8) - 0.1, end=ls(9) - 0.15, fin=0.3, fout=0.0, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 11.10, 12.12, zoom=YZ, cx=YX), P('c3', 12.20, 13.95, zoom=YZ, cx=0.64)], events=[])           # market · his street
    S['young_teeth'] = dict(act='I', host='s03', mode='over', start=ls(9) - 0.1, end=le(10) + 0.25, fin=0.0, fout=0.25, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 1.00, 4.40, dur=le(10) + 0.35 - ls(9), zoom=[(0, 1.55), (5.0, 1.64)], cx=0.56, cy=0.65)], events=[])  # the teeth (extreme close-up)
    w0, w1 = ls(11) - 0.1, span(8, 13)[1]
    S['young_walk'] = dict(act='I', host='s03', mode='under', start=w0, end=w1, fin=0.2, fout=0.0, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 4.55, 7.70, dur=w1 - w0, zoom=[(0, YZ), (w1 - w0, 1.34)], cx=0.62)], events=[])                # walking (slow motion), under the km counter
    n0, n1 = span(14, 15)
    S['young_name'] = dict(act='I', host='s04', mode='under', start=n0, end=n1, fin=0.3, fout=0.0, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 7.85, 10.55, dur=n1 - n0, zoom=[(0, 1.5), (4.3, 1.58)], cx=0.57, cy=0.62)], events=[])        # close-up under the name
    S['young_sc'] = dict(act='II', host='s09', mode='under', start=ls(33) - 0.12, end=ls(34) - 0.02, fin=0.0, fout=0.0, credit='ARCHIVE · TV GLOBO',
        pieces=[P('c3', 15.25, 16.30, dur=ls(34) + 0.1 - ls(33), zoom=[(0, YZ), (1.6, 1.3)], cx=0.63)], events=[])    # Santa Cruz: the Globo interview
    # (the badge-kiss shot at 108 s was dropped: the page logo sits over his face in every usable framing)
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
         (ls(108) + 0.03, 59.30), (ls(108) + 0.83, 59.92), (k1, 59.92)]   # aftermath near real speed, then hold (no smear)
    rel = lambda pts: [(round(t - k0, 3), v) for t, v in pts]
    S['kick'] = dict(act='VI', host='s21', mode='under', start=k0, end=k1, fin=0.12, fout=0.0, pieces=[
        P('c2', 57.10, 59.92, dur=k1 - k0, tmap=rel(A), box=(0, 318, 576, 480),                              # the shot is letterboxed 6:5
          zoom=rel([(k0, 1.0), (le(106), 1.06), (ls(107) - 0.05, 1.10), (ls(107) + 0.03, 1.0), (ls(108) + 1.53, 1.0), (k1, 1.10)]),
          cx=rel([(k0, 0.60), (ls(107), 0.55), (ls(108), 0.46), (k1, 0.5)]))], events=[])     # chest · air · overhead · goal
    r0, r1 = ls(115) - 0.02, span(112, 115)[1]
    S['replay'] = dict(act='VI', host='s22', mode='over', start=r0, end=r1, fin=0.15, fout=0.25, pieces=[
        P('c5', 152.30, 154.90, dur=r1 - r0, zoom=[(0, 1.0), (2.6, 1.05)], cx=0.5)], events=[])               # «RIVALDO 10», the Camp Nou behind
    q0, q1 = ls(128) + 0.05, ls(129) - 0.1
    S['recap_night'] = dict(act='EP', host='s25', mode='over', start=q0, end=q1, fin=0.15, fout=0.25,
                            pieces=[P('c5', 74.95, 77.70, dur=q1 - q0, cx=0.5)], events=[])                  # that night: the roar, the hug
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
    if src == 'c5': return (0, 320, 576, 408)            # picture below the burned-in «Rivaldo vs València» title
    r = subprocess.run(['ffmpeg', '-hide_banner', '-ss', f'{a:.3f}', '-to', f'{max(b, a + 0.1):.3f}', '-i', SRC[src],
                        '-vf', 'cropdetect=limit=24:round=2:reset=1', '-f', 'null', '-'], capture_output=True, text=True).stderr
    crops = [l.split('crop=')[1].strip() for l in r.splitlines() if 'crop=' in l]
    w, h, x, y = map(int, Counter(crops).most_common(1)[0][0].split(':'))
    return (x, y, w, h)

def decode(src, a, b, box, fps_i):
    x, y, w, h = box
    vf = ('delogo=x=198:y=370:w=182:h=28,' if src == 'c1' else '') + f'crop={w}:{h}:{x}:{y},hqdn3d=1.5:1.5:3:3'
    vf += f',minterpolate=fps={fps_i}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1' if fps_i != 30 else ',fps=30'
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
        if tm: speeds = [(b2 - b1) / max(1e-9, t2 - t1) for (t1, b1), (t2, b2) in zip(tm, tm[1:]) if b2 > b1]; slow = bool(speeds) and min(speeds) < 0.8
        else: slow = 0 < speed < 0.95
        fps_i = 120 if slow else 30
        box = p['box'] or active_box(p['src'], p['a'], max(p['b'], p['a'] + 0.2))
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
        man[name] = dict(src=f'assets/footage/{name}.mp4', start=round(ins['start'], 3), dur=round(n_total / FPS, 3), host=ins['host'], credit=ins.get('credit'), op=ins.get('op', 1.0),
                         mode=ins['mode'], fin=ins['fin'], fout=ins['fout'],
                         events=[[k, round(ins['start'] + t, 3)] for k, t in ins.get('events', [])] + cuts)
        json.dump(man, open(man_path, 'w'), indent=1)
    print('manifest:', {k: (v['start'], v['dur']) for k, v in man.items()})

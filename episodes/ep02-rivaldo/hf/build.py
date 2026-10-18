#!/usr/bin/env python3
"""Build the HyperFrames composition (index.html) for Episode 2: Rivaldo.

Inputs: ../audio/line_timings_edit.json, ../audio/subs_edit.json, ../om/scene_plan.json.
Photos: drop files named p01.jpg, p19c.png ... (see shot_list.md numbers) into assets/photos/
and re-run; every slot without a file renders as a labelled placeholder.
Design: series/BarcelonaArmyEgypt_DesignSystem_v9.md (tokens in ../../../series/engine/tokens.css).
"""
import json, os, glob, html, math, random

HERE = os.path.dirname(os.path.abspath(__file__))
EP = os.path.dirname(HERE)
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
SUBS = json.load(open(f'{EP}/audio/subs_edit.json', encoding='utf-8'))
FPS = 30
BODY_END = round(L[-1]['end'] + 0.4, 2)
END_CARD = 4.6
TOTAL = round(BODY_END + END_CARD, 2)
# archive footage inserts (footage.py): {name: {src, start, dur, host, mode, fin, fout}}
_MAN = f'{HERE}/assets/footage/manifest.json'
FOOT = json.load(open(_MAN)) if os.path.exists(_MAN) else {}
SCENE_Z = {}

def ls(i): return round(L[i]['start'], 3)
def le(i): return round(L[i]['end'], 3)

# ---------------------------------------------------------------- acts (DS §3)
ACTS = [  # key, numeral, name, start line, saturate, sepia, grade colour, grade alpha, barca
    ('cold', '', '', 0, 0.85, 0.14, 'var(--gold500)', 0.09, 0.35),
    ('I', 'I', 'THE HUNGER', 4, 0.10, 0.06, 'var(--stone300)', 0.10, 0.0),
    ('II', 'II', 'THE RISE', 33, 0.35, 0.14, 'var(--gold700)', 0.08, 0.0),
    ('III', 'III', 'BARCELONA', 42, 0.55, 0.06, 'var(--white200)', 0.05, 0.35),
    ('IV', 'IV', 'THE BALLON D’OR', 52, 0.85, 0.14, 'var(--gold500)', 0.11, 0.5),
    ('V', 'V', 'THE BENCH', 65, 0.30, 0.06, 'var(--stone300)', 0.08, 0.2),
    ('VI', 'VI', 'ONE NIGHT', 79, 0.95, 0.04, 'var(--white200)', 0.04, 1.0),
    ('VII', 'VII', 'YOKOHAMA ’02', 116, 0.70, 0.08, 'var(--stone200)', 0.06, 0.0),
    ('EP', '—', 'EPILOGUE', 122, 0.85, 0.10, 'var(--gold500)', 0.09, 0.35),
]
ACT = {a[0]: a for a in ACTS}
NUMBERED = [a for a in ACTS if a[1]]

# ---------------------------------------------------------------- photos
PHOTO_DIR = f'{HERE}/assets/photos'
# slot -> (source file slot, object-position / zoom origin, zoom). Several slots can frame one photo;
# crops also keep source watermarks (rivaldo10.com, planetfootball) out of frame.
FRAMING = {
    '1': ('1', '50% 25%', 1.0), '1b': ('1b', '50% 35%', 1.0), '23': ('23', '50% 18%', 1.0),
    '2': ('2', '50% 25%', 1.0), '18': ('18', '35% 30%', 1.12), '5': ('5', '50% 30%', 1.0), '10a': ('10a', '50% 30%', 1.0),
    '4': ('4', '50% 40%', 1.0), '12': ('12', '50% 25%', 1.0), '12i': ('12i', '32% 30%', 1.0), '13': ('13', '50% 30%', 1.0), '10d': ('10d', '50% 25%', 1.0), '24': ('24', '50% 30%', 1.0),
'21f': ('21f', '50% 40%', 1.0), '21': ('21', '50% 40%', 1.0),
    '19a': ('19e', '41% 50%', 1.0), '19b': ('20', '68% 50%', 1.0),
    '19c': ('19e', '72% 42%', 1.9), '19d': ('19e', '45% 4%', 1.8), '19e': ('19e', '41% 50%', 1.0),
    '20': ('20', '68% 50%', 1.0),
    '15': ('15', '50% 30%', 1.0), '8': ('8k', '50% 30%', 1.0), '10b': ('10b', '50% 20%', 1.0), '10c': ('10c', '50% 30%', 1.0),
    '13bd': ('13bd', '50% 35%', 1.0), '15bg': ('15bg', '50% 32%', 1.0),
}
def photo_file(slot):
    src = FRAMING.get(slot, (slot,))[0]
    for ext in ('jpg', 'jpeg', 'png', 'webp'):
        p = f'{PHOTO_DIR}/p{src}.{ext}'
        if os.path.exists(p): return f'assets/photos/p{src}.{ext}'
    return None

body, js, css = [], [], []
uid = [0]
def nid(prefix):
    uid[0] += 1; return f'{prefix}{uid[0]}'

def photo(sid, slot, label, meta, act, move='dolly_in', t0=0, t1=1, z=1, box='inset:0', pos='50% 50%', extra_cls='', optional=False):
    """A graded photo (or labelled placeholder) with a motivated camera move between t0 and t1 (global)."""
    _, _, _, _, sat, sep, gcol, galpha, _ = ACT[act]
    f = photo_file(slot)
    if optional and not f: return None
    i = nid(f'{sid}-ph')
    if f:
        _, fpos, fz = FRAMING.get(slot, (slot, pos, 1.0))
        inner = (f'<img id="{i}-img" src="{f}" style="width:100%;height:100%;object-fit:cover;object-position:{fpos};'
                 f'transform:scale({fz});transform-origin:{fpos};filter:saturate({sat}) sepia({sep}) contrast(1.04)">')
    else:
        inner = (f'<div class="ph-card" style="filter:saturate({sat}) sepia({sep})"><div class="ph-frame"></div>'
                 f'<div class="ph-text"><div class="mono ph-no">PHOTO #{html.escape(slot)}</div>'
                 f'<div class="label ph-label">{html.escape(label)}</div>'
                 f'<div class="mono ph-meta">{html.escape(meta)}</div></div></div>')
    body.append(f'<div id="{i}" class="photo {extra_cls}" style="{box};z-index:{z}"><div id="{i}-cam" class="cam">{inner}</div>'
                f'<div class="grade" style="background:{gcol};opacity:{galpha}"></div><div class="vig"></div></div>')
    d = max(0.1, t1 - t0)
    moves = {
        'dolly_in': ({'scale': 1.0}, {'scale': 1.08}), 'dolly_out': ({'scale': 1.12}, {'scale': 1.0}),
        'zoom_in': ({'scale': 1.02}, {'scale': 1.14}), 'zoom_out': ({'scale': 1.14}, {'scale': 1.02}),
        'pan_left': ({'scale': 1.12, 'x': 40}, {'scale': 1.12, 'x': -40}), 'pan_right': ({'scale': 1.12, 'x': -40}, {'scale': 1.12, 'x': 40}),
        'tracking_left': ({'scale': 1.1, 'x': 60}, {'scale': 1.1, 'x': -60}), 'crane_up': ({'scale': 1.14, 'y': 40}, {'scale': 1.02, 'y': -10}),
        'static': ({'scale': 1.02}, {'scale': 1.03}),
    }
    a, b = moves.get(move, moves['dolly_in'])
    js.append(f'tl.fromTo("#{i}-cam",{json.dumps(a)},{{...{json.dumps(b)},duration:{d:.3f},ease:"none"}},{t0:.3f});')
    return i

def polaroid(sid, slot, caption, act, t0, t1, z=5, left=230, top=330, w=620, h=800, rot=-3):
    """DS §2.3 polaroid: white100 frame, paper300 tape, ink caption; slides in like a print, then a slow push."""
    f = photo_file(slot)
    if not f: return None
    _, _, _, _, sat, sep, gcol, galpha, _ = ACT[act]
    _, fpos, fz = FRAMING.get(slot, (slot, '50% 50%', 1.0))
    i = nid(f'{sid}-pol')
    body.append(f'<div id="{i}" style="position:absolute;left:{left}px;top:{top}px;width:{w}px;height:{h}px;z-index:{z};transform:rotate({rot}deg)">'
                f'<div class="pol-frame"><div class="pol-img"><img src="{f}" style="width:100%;height:100%;object-fit:cover;object-position:{fpos};filter:saturate({sat}) sepia({sep})"></div>'
                f'<div class="pol-cap mono">{html.escape(caption)}</div></div><div class="pol-tape"></div></div>')
    js.append(f'tl.fromTo("#{i}",{{x:-1100,rotation:{rot-6}}},{{x:0,rotation:{rot},duration:0.55,ease:"quint.out"}},{t0:.3f});')
    js.append(f'tl.to("#{i}",{{scale:1.05,duration:{max(0.5,t1-t0-0.6):.2f},ease:"none"}},{t0+0.55:.3f});')
    return i

def fade(sel, t, d=0.3, to=1, frm=None):
    if frm is None: frm = 1 - to
    js.append(f'tl.fromTo("{sel}",{{opacity:{frm}}},{{opacity:{to},duration:{d},ease:"power1.inOut"}},{t:.3f});')

def rise(sel, t, d=0.28, y=18):  # DS 5.1 content-in: 0.28 s ease-out + slight rise
    js.append(f'tl.fromTo("{sel}",{{opacity:0,y:{y}}},{{opacity:1,y:0,duration:{d},ease:"cubic.out"}},{t:.3f});')

def punch(sel, t, s=1.28, d=0.26):  # DS 6 punch-in
    js.append(f'tl.fromTo("{sel}",{{opacity:0,scale:{s}}},{{opacity:1,scale:1,duration:{d},ease:"cubic.out"}},{t:.3f});')

def scene(sid, t0, t1, inner, z, bg='var(--bgBase)'):
    body.append(f'<section id="{sid}" class="clip scene" data-start="{t0:.3f}" data-duration="{t1-t0:.3f}" '
                f'data-track-index="{1 + (int(sid[1:]) % 2)}" style="z-index:{z}"><div id="{sid}-fill" class="fill" style="background:{bg}"></div>{inner}</section>')

def open_scene(sid, t0, t1, z, bg='var(--bgBase)'):
    """Start collecting body markup for a scene; returns a closer."""
    SCENE_Z[sid] = z
    start = len(body)
    def close():
        inner = ''.join(body[start:]); del body[start:]
        scene(sid, t0, t1, inner, z, bg)
    return close

XF = 0.3  # cross-fade overlap
def span(a, b):  # scene window from line a start to line b+1 start (+overlap)
    t0 = 0.0 if a == 0 else ls(a) - 0.25
    t1 = (ls(b + 1) - 0.25 + XF) if b + 1 < len(L) else BODY_END
    return round(t0, 3), round(t1, 3)

def xin(sid, t0):
    if t0 > 0: fade(f'#{sid}', t0, XF)

# ======================================================================= SCENES
z = 10
# s01 cold open: trophy (colour → B&W on «انهارت»), Van Gaal, bench
t0, t1 = span(0, 3); c = open_scene('s01', t0, t1, z)
a = photo('s01', '1', 'RIVALDO · BALLON D’OR', 'DECEMBER 1999', 'cold', 'dolly_in', 0, ls(2))
if 'open_a' in FOOT:   # footage carries line 0 and line 2; the stills keep line 1 («علاقته بمدرب برشلونة انهارت»)
    v = photo('s01', '2', 'LOUIS VAN GAAL', 'TOUCHLINE · 1999–2000', 'I', 'dolly_in', ls(1) + 0.45, ls(3), z=3)
    fade(f'#{v}', ls(1) + 0.45, 0.25, 1, 0)
else:
    b = photo('s01', '1', 'RIVALDO · BALLON D’OR', 'DECEMBER 1999', 'I', 'dolly_in', 0, ls(2), z=2)
    fade(f'#{b}', ls(1) + 0.4, 1.2, 1, 0)
    v = photo('s01', '2', 'LOUIS VAN GAAL', 'TOUCHLINE · 1999–2000', 'I', 'dolly_in', ls(2), ls(3), z=3)
    fade(f'#{v}', ls(2) - 0.1, 0.25, 1, 0)
bn = photo('s01', '3', 'RIVALDO ON THE BENCH', '1999–2000', 'I', 'zoom_in', ls(3), t1, z=4, optional=True)
if bn: fade(f'#{bn}', ls(3) - 0.1, 0.25, 1, 0)
else: js.append(f'tl.to("#{v}-cam",{{scale:1.16,duration:{t1-ls(3):.2f},ease:"none"}},{ls(3):.3f});')
c(); z += 2

# s02 rewind 1999 → 1980s
t0, t1 = span(4, 7); c = open_scene('s02', t0, t1, z, 'var(--bgDeep)')
if 'rewind' in FOOT:   # his career runs backwards, 2001 → the boy in Recife, under the year counter
    js.append(f'tl.set("#s02-fill",{{opacity:0}},{t0:.3f});')
    body.append('<div class="scrim" style="top:380px;height:520px;z-index:5"></div>')
else:
    p = photo('s02', '1', 'RIVALDO · BALLON D’OR', 'DECEMBER 1999', 'I', 'dolly_out', t0, t1)
    js.append(f'tl.to("#{p}",{{opacity:0.0,scale:0.86,duration:{t1-t0-0.2:.2f},ease:"power2.in"}},{t0:.3f});')
years = ['1999', '1997', '1995', '1993', '1991', '1989', '1986', '1983', '1980']
yt = ls(6)
body.append('<div class="center-col" style="top:470px">' + ''.join(
    f'<div id="s02-y{k}" class="serif-i gold yr" style="opacity:0">{y}</div>' for k, y in enumerate(years)) + '</div>')
for k in range(len(years)):
    tt = yt + k * 0.17
    js.append(f'tl.fromTo("#s02-y{k}",{{opacity:0,y:-30}},{{opacity:1,y:0,duration:0.08,ease:"none"}},{tt:.3f});')
    if k < len(years) - 1:
        js.append(f'tl.to("#s02-y{k}",{{opacity:0,y:30,duration:0.08,ease:"none"}},{tt+0.17:.3f});')
js.append(f'tl.to("#s02-y{len(years)-1}",{{opacity:0,duration:0.4}},{t1-0.45:.3f});')
xin('s02', t0); c(); z += 2

# s03 hunger: neighbourhood + km counter, early portrait
t0, t1 = span(8, 13); c = open_scene('s03', t0, t1, z)
p4 = photo('s03', '4', 'RECIFE · PAULISTA NEIGHBOURHOOD', 'PERNAMBUCO · 1980s', 'I', 'pan_left', t0, ls(12))
if 'young_walk' in FOOT:   # the young Rivaldo walking (TV Globo) plays under the km counter
    W_ = FOOT['young_walk']
    js.append(f'tl.to("#{p4}",{{opacity:0,duration:0.2}},{W_["start"]:.3f}); tl.set("#s03-fill",{{opacity:0}},{W_["start"]+0.2:.3f});')
if 'young_walk' not in FOOT:   # with the footage, the walk carries on through «مكانش معاه فلوس للمواصلات»
    p5 = photo('s03', '5', 'YOUNG RIVALDO', 'SANTA CRUZ · c.1990', 'I', 'dolly_in', ls(12), t1, z=2)
    fade(f'#{p5}', ls(12) - 0.15, 0.4, 1, 0)
body.append('<div id="s03-km" class="plate-mini" style="left:60px;top:680px;opacity:0"><span id="s03-kmv" class="hero gold" style="font-size:150px">0</span>'
            '<span class="label" style="font-size:30px;letter-spacing:8px;color:var(--textSecondary);margin-left:16px">KM</span>'
            '<div class="mono" style="font-size:22px;color:var(--textSecondary);margin-top:6px">≈ EVERY DAY, ON FOOT · EL GRÁFICO 1999</div></div>')
rise('#s03-km', ls(11) + 0.2)
js.append(f'(()=>{{const o={{v:0}},el=document.getElementById("s03-kmv");tl.to(o,{{v:15,duration:1.6,ease:"power2.out",onUpdate:()=>{{el.textContent=Math.round(o.v)}}}},{ls(11)+0.3:.3f});}})();')
js.append(f'tl.to("#s03-km",{{opacity:0,duration:0.3}},{ls(12)-0.2:.3f});')
xin('s03', t0); c(); z += 2

# s04 name reveal
t0, t1 = span(14, 15); c = open_scene('s04', t0, t1, z)
if 'young_name' in FOOT:   # the teenager on TV Globo, under his full name
    js.append(f'tl.set("#s04-fill",{{opacity:0}},{t0:.3f});')
    body.append('<div class="scrim" style="top:560px;height:560px;z-index:10"></div>')
else:
    photo('s04', '6', 'RIVALDO · PORTRAIT', 'CLOSE-UP', 'I', 'static', t0, t1, optional=True)
name = 'RIVALDO'
body.append('<div class="center-col" style="top:700px;z-index:20"><div class="hero" style="font-size:250px;display:flex;justify-content:center">' +
            ''.join(f'<span id="s04-c{k}" class="gold" style="display:inline-block;opacity:0">{ch}</span>' for k, ch in enumerate(name)) +
            '</div><div id="s04-full" class="label" style="font-size:30px;letter-spacing:12px;color:var(--textSecondary);margin-top:14px;opacity:0">VÍTOR BORBA FERREIRA</div></div>')
for k in range(len(name)):
    punch(f'#s04-c{k}', ls(15) + k * 0.045, 1.3, 0.24)
rise('#s04-full', ls(15) + 0.6)
xin('s04', t0); c(); z += 2

# s05 map of Brazil, Recife, 1972
t0, t1 = span(16, 18); c = open_scene('s05', t0, t1, z, 'var(--bgBase)')
svg = open(f'{HERE}/assets/brazil.svg', encoding='utf-8').read()
body.append(f'<div id="s05-map" style="position:absolute;left:90px;top:300px;width:900px;height:760px">{svg}'
            '<div id="s05-dot" style="position:absolute;left:760px;top:248px;width:26px;height:26px;border-radius:50%;background:var(--gold300);opacity:0"></div>'
            '<div id="s05-ring" style="position:absolute;left:737px;top:225px;width:72px;height:72px;border-radius:50%;border:2px solid var(--gold500);opacity:0"></div>'
            '<div id="s05-lab" style="position:absolute;left:420px;top:300px;text-align:right;width:340px;opacity:0"><div class="label" style="font-size:30px;letter-spacing:8px;color:var(--white100)">RECIFE</div>'
            '<div class="mono" style="font-size:22px;color:var(--textSecondary)">8.05°S · 34.88°W</div></div></div>'
            '<div class="center-col" style="top:150px"><div id="s05-yr" class="serif-i gold" style="font-size:170px;opacity:0">1972</div></div>')
js.append(f'tl.fromTo("#s05-map",{{scale:0.92,opacity:0}},{{scale:1.0,opacity:1,duration:0.9,ease:"cubic.out"}},{t0+0.05:.3f});')
js.append(f'tl.to("#s05-map",{{scale:1.06,duration:{t1-t0-1:.2f},ease:"none"}},{t0+0.95:.3f});')
punch('#s05-yr', ls(16) + 0.35, 1.2)
js.append(f'tl.fromTo("#s05-dot",{{opacity:0,scale:2.4}},{{opacity:1,scale:1,duration:0.3,ease:"back.out(1.9)"}},{ls(16)+1.3:.3f});')
js.append(f'tl.fromTo("#s05-ring",{{opacity:0.9,scale:0.4}},{{opacity:0,scale:1.6,duration:1.2,ease:"cubic.out",repeat:2}},{ls(16)+1.4:.3f});')
rise('#s05-lab', ls(16) + 1.5)
xin('s05', t0); c(); z += 2

# s06 the father
t0, t1 = span(19, 23); c = open_scene('s06', t0, t1, z)
photo('s06', '8', 'ROMILDO · HIS FATHER', 'BEFORE 1989', 'I', 'dolly_in', t0, t1, optional=True) or photo('s06', '4', 'HOME', '', 'II', 'dolly_in', t0, t1)
xin('s06', t0); c(); z += 2

# s07 1989 on black, silence
t0, t1 = span(24, 28); c = open_scene('s07', t0, t1, z, 'var(--bgDeep)')
body.append('<div class="center-col" style="top:470px"><div id="s07-y" class="serif-i" style="font-size:300px;color:var(--white100);opacity:0">1989</div></div>')
js.append(f'tl.fromTo("#s07-y",{{opacity:0,scale:1.04}},{{opacity:0.92,scale:1,duration:1.2,ease:"cubic.out"}},{ls(24)+0.1:.3f});')
js.append(f'tl.to("#s07-y",{{opacity:0.35,duration:1.0}},{ls(26)-0.4:.3f});')
js.append(f'tl.to("#s07-y",{{opacity:0,duration:0.8}},{t1-1.0:.3f});')
xin('s07', t0); c(); z += 2

# s08 the mother says: keep going
t0, t1 = span(29, 32); c = open_scene('s08', t0, t1, z)
photo('s08', '5', 'YOUNG RIVALDO', 'SANTA CRUZ · c.1990', 'II', 'dolly_in', t0, t1)
xin('s08', t0); c(); z += 2

# s09 the four Brazilian clubs (type-only names, no modern crests)
t0, t1 = span(33, 37); c = open_scene('s09', t0, t1, z)
clubs = [('10a', 'SANTA CRUZ', '1989–92'), ('10b', 'MOGI MIRIM', '1992–93'), ('10c', 'CORINTHIANS', '1993–94'), ('10d', 'PALMEIRAS', '1994–96')]
for k, (slot, nm, yrs) in enumerate(clubs):
    tt = ls(33 + k)
    p = photo('s09', slot, nm, yrs, 'II', 'dolly_in', tt, tt + 2.5, z=2 + k, optional=True)
    if not p:
        p = nid('s09-card'); body.append(f'<div id="{p}" class="photo" style="inset:0;z-index:{2+k};background:var(--bgDeep)"></div>')
    js.append(f'tl.fromTo("#{p}",{{x:1080,opacity:1}},{{x:0,duration:0.42,ease:"quint.out"}},{tt-0.12:.3f});')
    body.append(f'<div id="s09-n{k}" class="club" style="top:{150+k*70}px;opacity:0;z-index:20"><span class="label">{nm}</span><span class="mono">{yrs}</span></div>')
    rise(f'#s09-n{k}', tt, 0.28, 10)
xin('s09', t0); c(); z += 2

# s10 Deportivo
t0, t1 = span(38, 41); c = open_scene('s10', t0, t1, z)
if not polaroid('s10', '11', 'LA CORUÑA · 1996–97', 'II', ls(38) + 0.1, t1, top=330, h=680, left=250, w=580): photo('s10', '11', 'DEPORTIVO LA CORUÑA', '1996–97', 'II', 'zoom_out', t0, t1)
body.append('<div class="center-col" style="top:150px;z-index:20"><div id="s10-y" class="serif-i gold" style="font-size:170px;opacity:0">1996</div>'
            '<div id="s10-m" class="mono" style="font-size:24px;color:var(--textSecondary);opacity:0">LA CORUÑA · ONE SEASON</div></div>')
punch('#s10-y', ls(38) + 0.2, 1.2); rise('#s10-m', ls(40))
xin('s10', t0); c(); z += 2

# s11 Ronaldo leaves, Rivaldo arrives
t0, t1 = span(42, 46); c = open_scene('s11', t0, t1, z)
r = photo('s11', '12', 'RONALDO', 'BARCELONA → INTER · 1997', 'III', 'pan_right', t0, ls(46))
# «اللي انتقل لإنتر ميلان»: Ronaldo holding the Inter Nº10 shirt whips in; on «نجم برازيلي جديد» Rivaldo pushes it out
ri = photo('s11', '12i', 'RONALDO JOINS INTER', 'MILAN · SUMMER 1997', 'III', 'dolly_in', ls(44) - 0.15, ls(45) + 0.8, z=2, optional=True)
swap = ls(45) + 0.25 if ri else ls(44) + 0.3
if ri:
    js.append(f'tl.fromTo("#{ri}",{{x:1080}},{{x:0,duration:0.4,ease:"quint.out"}},{ls(44)-0.15:.3f});')
    js.append(f'tl.to("#{ri}",{{x:-1080,duration:0.5,ease:"cubic.in"}},{swap:.3f});')
js.append(f'tl.to("#{r}",{{x:-1080,duration:0.5,ease:"cubic.in"}},{(ls(44) + 0.1) if ri else swap:.3f});')
rv = photo('s11', '13', 'RIVALDO PRESENTED AT BARÇA', 'SUMMER 1997', 'III', 'dolly_in', ls(45), t1, z=3)
js.append(f'tl.fromTo("#{rv}",{{x:1080}},{{x:0,duration:0.45,ease:"quint.out"}},{swap+0.1:.3f});')
body.append('<div id="s11-str" class="stripes" style="opacity:0;z-index:2"></div>')
js.append(f'tl.to("#s11-str",{{opacity:0.10,duration:0.6}},{swap+0.3:.3f});')
js.append(f'tl.to("#s11-str",{{opacity:0.26,duration:0.5}},{ls(46)+0.6:.3f});')
xin('s11', t0); c(); z += 2

# s12 two Ligas + one Copa: morph plate over celebration
t0, t1 = span(47, 51); c = open_scene('s12', t0, t1, z)
if 'showA' in FOOT:   # Barça skills showcase plays under the plate (footage sits just below this scene)
    js.append(f'tl.set("#s12-fill",{{opacity:0}},{t0:.3f});')
    body.append('<div id="s12-scrim" style="position:absolute;inset:0;background:rgba(6,5,4,.5);opacity:0"></div>')
    fade('#s12-scrim', ls(49) - 0.1, 0.5)
elif not photo('s12', '14', 'LIGA CELEBRATION', '1998 OR 1999', 'III', 'dolly_out', t0, t1, optional=True): body.append('<div class="stripes" style="opacity:0.2"></div><div class="fadeV"></div>')
body.append('<div id="s12-pl" class="plate" style="left:110px;top:430px;width:860px;height:420px;opacity:0;z-index:20">'
            '<div class="tick tl"></div><div class="tick tr"></div><div class="tick bl"></div><div class="tick br"></div><div class="acc"></div>'
            '<div id="s12-r1" class="trow" style="top:50px;opacity:0"><span class="label">LA LIGA</span><span class="hero gold">×2</span></div>'
            '<div class="hair" style="top:208px"></div>'
            '<div id="s12-r2" class="trow" style="top:225px;opacity:0"><span class="label">COPA DEL REY</span><span class="hero" style="color:var(--white100)">×1</span></div>'
            '<div class="mono" style="position:absolute;left:70px;bottom:26px;font-size:22px;color:var(--textDim)">1997–98 · 1998–99</div></div>')
js.append(f'tl.fromTo("#s12-pl",{{opacity:0,scaleY:0.2}},{{opacity:1,scaleY:1,duration:0.62,ease:"cubic.out"}},{ls(49):.3f});')
rise('#s12-r1', ls(50) + 1.1); rise('#s12-r2', ls(51))
xin('s12', t0); c(); z += 2

# s13 date card, Ballon d'Or
t0, t1 = span(52, 55); c = open_scene('s13', t0, t1, z, 'var(--bgDeep)')
pbd = photo('s13', '13bd', 'RIVALDO · BALLON D’OR', 'FRANCE FOOTBALL · 1999', 'IV', 'dolly_in', t0, t1, optional=True)
if pbd:
    js.append(f'tl.set("#{pbd}",{{opacity:0.5}},{t0:.3f});')
    body.append('<div class="scrim" style="top:330px;height:520px;z-index:5"></div>')
body.append('<div class="center-col" style="top:420px"><div id="s13-l" class="mono" style="font-size:26px;color:var(--textSecondary);opacity:0">FRANCE FOOTBALL</div>'
            '<div id="s13-d" class="serif-i gold" style="font-size:150px;line-height:1.1;opacity:0;padding:0 .1em">December 1999</div>'
            '<div id="s13-b" class="label" style="font-size:40px;letter-spacing:16px;color:var(--white100);opacity:0;margin-top:20px">BALLON D’OR</div></div>')
rise('#s13-l', ls(52) + 0.3); punch('#s13-d', ls(54), 1.15, 0.3); rise('#s13-b', ls(55) + 0.3)
xin('s13', t0); c(); z += 2

# s14 Beckham, the treble
t0, t1 = span(56, 57); c = open_scene('s14', t0, t1, z)
has15 = photo('s14', '15', 'DAVID BECKHAM', 'MANCHESTER UNITED · 1998–99', 'IV', 'zoom_in', t0, t1, optional=True)
body.append(f'<div class="center-col" style="top:{150 if has15 else 470}px;z-index:20"><div id="s14-m" class="mono" style="font-size:26px;color:var(--textSecondary);opacity:0">MANCHESTER UNITED · 1998–99</div>'
            + ('' if has15 else '<div id="s14-n" class="hero" style="font-size:150px;color:var(--white100);opacity:0;margin-top:14px">DAVID BECKHAM</div>') +
            '<div id="s14-t" class="label" style="font-size:64px;letter-spacing:18px;color:var(--gold300);opacity:0;margin-top:18px">THE TREBLE</div></div>')
rise('#s14-m', ls(56) + 0.4); punch('#s14-t', ls(57) + 0.6, 1.2)
if not has15: punch('#s14-n', ls(56) + 0.1, 1.15, 0.3)
xin('s14', t0); c(); z += 2

# s15 GOLD CLIMAX: 154 / 219, then darkroom reveal of #1 (slowest move)
HAS17 = photo_file('17') is not None
t0, t1 = span(58, 61 if HAS17 else 62); c = open_scene('s15', t0, t1, z, 'var(--bgDeep)')
pbg = photo('s15', '15bg', 'RIVALDO · BALLON D’OR', 'CAMP NOU · 1999', 'IV', 'dolly_in', t0, t1, z=0, optional=True)
if pbg: js.append(f'tl.set("#{pbg}",{{opacity:0.3}},{t0:.3f});')
body.append('<div id="s15-wrap" style="position:absolute;inset:0">'
            '<div class="center-col" style="top:150px"><div class="mono" style="font-size:24px;color:var(--textSecondary)">FRANCE FOOTBALL · 1999</div>'
            '<div class="serif-i gold" style="font-size:150px;line-height:1.05;padding:0 .1em">Ballon d’Or</div></div>'
            '<div id="s15-pl" class="plate" style="left:90px;top:420px;width:900px;height:600px">'
            '<div class="tick tl"></div><div class="tick tr"></div><div class="tick bl"></div><div class="tick br"></div><div class="acc"></div>'
            '<div id="s15-r1" class="srow" style="top:40px;height:210px;opacity:0"><div class="who"><div class="label n">David Beckham</div><div class="mono c">MANCHESTER UNITED</div></div>'
            '<div class="num"><div id="s15-v1" class="hero" style="font-size:210px;color:var(--white100)">0</div><div class="label pts">PTS</div></div></div>'
            '<div class="hair" style="top:292px"></div>'
            '<div id="s15-r2" class="srow" style="top:300px;height:270px;opacity:0"><div class="who win"><div class="label n">Rivaldo</div><div class="mono c">FC BARCELONA</div></div>'
            '<div class="num"><div id="s15-v2" class="hero gold" style="font-size:300px">0</div><div class="label pts">PTS</div></div></div></div></div>')
js.append(f'tl.fromTo("#s15-wrap",{{opacity:0}},{{opacity:1,duration:0.6}},{t0+0.1:.3f});')
rise('#s15-r1', ls(59)); rise('#s15-r2', ls(60))
for k, (li, val) in enumerate([(59, 154), (60, 219)], 1):
    js.append(f'(()=>{{const o={{v:0}},el=document.getElementById("s15-v{k}");tl.to(o,{{v:{val},duration:{1.1 if k==1 else 1.4},ease:"power2.out",onUpdate:()=>{{el.textContent=Math.round(o.v)}}}},{ls(li)+0.15:.3f});}})();')
dk = photo('s15', '1', 'RIVALDO · BALLON D’OR', 'DARKROOM REVEAL (HIGHLIGHTS FIRST)', 'IV', 'dolly_out', ls(61), t1, z=30)
js.append(f'tl.fromTo("#{dk}",{{opacity:0}},{{opacity:1,duration:2.0,ease:"power2.in"}},{ls(61)+0.2:.3f});')
js.append(f'tl.to("#s15-wrap",{{opacity:0,scale:0.96,duration:1.6,ease:"power1.inOut"}},{ls(61)+0.4:.3f});')
xin('s15', t0); c()
DARK = 'assets/darkroom_p1.mp4'
if os.path.exists(f'{HERE}/{DARK}'):
    js.append(f'tl.set("#{dk}",{{opacity:0}},{ls(61)+0.15:.3f});')
    dstart = ls(61) + 0.2
    body.append(f'<video id="s15-dark" class="clip" src="{DARK}" data-start="{dstart:.3f}" data-duration="{t1-dstart:.3f}" data-track-index="3" '
                f'muted playsinline style="position:absolute;left:0;top:0;width:1080px;height:1350px;object-fit:cover;z-index:{z}"></video>')
z += 2

# s16 FIFA award, then child ↔ trophy split frame
t0, t1 = span(62 if HAS17 else 63, 64); c = open_scene('s16', t0, t1, z)
if HAS17: photo('s16', '17', 'FIFA WORLD PLAYER 1999', 'PRESENTED JANUARY 2000', 'IV', 'static', t0, ls(63))
if photo_file('5'):
    l = photo('s16', '5', 'YOUNG RIVALDO', 'c.1990', 'I', 'dolly_in', ls(63), t1, z=3, box='left:0;top:0;width:540px;height:1350px')
    r = photo('s16', '1b', 'BALLON D’OR', '1999', 'IV', 'dolly_in', ls(63), t1, z=3, box='left:540px;top:0;width:540px;height:1350px')
    js.append(f'tl.fromTo("#{l}",{{x:-540}},{{x:0,duration:0.45,ease:"quint.out"}},{ls(63)-0.1:.3f});')
    js.append(f'tl.fromTo("#{r}",{{x:540}},{{x:0,duration:0.45,ease:"quint.out"}},{ls(64)-0.15:.3f});')
    body.append('<div id="s16-split" style="position:absolute;left:539px;top:0;width:2px;height:1350px;background:var(--gold500);opacity:0;z-index:9"></div>')
    fade('#s16-split', ls(64), 0.3)
else:
    r = photo('s16', '1b', 'BALLON D’OR', '1999', 'IV', 'dolly_in', ls(63) - 0.25, t1, z=3)
xin('s16', t0); c(); z += 2

# s17 «صح؟» … «لأ.» dip to black
t0, t1 = span(65, 67); c = open_scene('s17', t0, t1, z, 'var(--bgDeep)')
body.append('<div class="center-col" style="top:520px"><div id="s17-no" class="ar-statement" style="opacity:0">لأ.</div></div>')
js.append(f'tl.fromTo("#s17-no",{{opacity:0,scale:1.3}},{{opacity:1,scale:1,duration:0.22,ease:"cubic.out"}},{ls(67):.3f});')
xin('s17', t0); c(); z += 2

# s18 tactics board: left wing → the centre; dropped
t0, t1 = span(68, 78); c = open_scene('s18', t0, t1, z)
vg = photo('s18', '18', 'RIVALDO & VAN GAAL', '1997–2000', 'V', 'dolly_in', t0, ls(70))
body.append('<div id="s18-board" class="board" style="opacity:0;z-index:5">'
            '<div class="pitch"><div class="half"></div><div class="circle"></div><div class="box top"></div><div class="box bot"></div></div>'
            '<div id="s18-dot" class="pdot" style="left:120px;top:250px;opacity:0"></div>'
            '<div id="s18-lw" class="chalk-label" style="left:96px;top:300px;opacity:0">LEFT WING</div>'
            '<div id="s18-arrow" class="arrow" style="opacity:0"></div>'
            '<div id="s18-dot2" class="pdot gold-dot" style="left:395px;top:205px;opacity:0"></div>'
            '<div id="s18-no10" class="chalk-label" style="left:340px;top:150px;opacity:0;color:var(--gold300)">Nº 10</div></div>')
fade('#s18-board', ls(70) - 0.3, 0.4)
js.append(f'tl.fromTo("#s18-dot",{{opacity:0,scale:2}},{{opacity:1,scale:1,duration:0.3,ease:"back.out(1.9)"}},{ls(70)+1.4:.3f});')
rise('#s18-lw', ls(70) + 1.6)
js.append(f'tl.fromTo("#s18-arrow",{{opacity:0,scaleX:0}},{{opacity:1,scaleX:1,duration:0.6,ease:"cubic.out"}},{ls(71)+1.6:.3f});')
js.append(f'tl.fromTo("#s18-dot2",{{opacity:0,scale:2}},{{opacity:1,scale:1,duration:0.3,ease:"back.out(1.9)"}},{ls(72):.3f});')
rise('#s18-no10', ls(72) + 0.2)
bn = photo('s18', '3', 'RIVALDO ON THE BENCH', '1999–2000', 'V', 'zoom_in', ls(76), t1, z=8, optional=True)
if bn: js.append(f'tl.fromTo("#{bn}",{{opacity:0}},{{opacity:1,duration:0.3}},{ls(76)-0.1:.3f});')
xin('s18', t0); c(); z += 2

# s19 17 June 2001 + the stakes
t0, t1 = span(79, 87); c = open_scene('s19', t0, t1, z)
body.append('<div class="stripes" style="opacity:0.16"></div><div class="fadeV"></div>'
            '<div class="center-col" style="top:150px"><div id="s19-m" class="mono" style="font-size:24px;color:var(--textSecondary);opacity:0">CAMP NOU · LA LIGA · LAST MATCHDAY</div>'
            '<div id="s19-d" class="serif-i gold" style="font-size:140px;line-height:1.05;opacity:0;padding:0 .1em">17 June 2001</div></div>'
            '<div id="s19-pl" class="plate" style="left:110px;top:470px;width:860px;height:470px;opacity:0">'
            '<div class="tick tl"></div><div class="tick tr"></div><div class="tick bl"></div><div class="tick br"></div><div class="acc"></div>'
            '<div class="hero" style="position:absolute;left:0;right:0;top:40px;text-align:center;font-size:120px;color:var(--white100)">BAR <span style="color:var(--textMuted)">v</span> VAL</div>'
            '<div id="s19-w" class="stake" style="top:210px;opacity:0"><span class="label" style="color:var(--gold300)">WIN</span><span class="mono">→ CHAMPIONS LEAGUE</span></div>'
            '<div id="s19-dr" class="stake" style="top:310px;opacity:0"><span class="label" style="color:var(--textMuted)">DRAW</span><span class="mono">→ VALENCIA GO THROUGH</span></div></div>')
rise('#s19-m', ls(81) - 0.1); punch('#s19-d', ls(81), 1.15, 0.3)
js.append(f'tl.fromTo("#s19-pl",{{opacity:0,scaleY:0.2}},{{opacity:1,scaleY:1,duration:0.62,ease:"cubic.out"}},{ls(83):.3f});')
rise('#s19-w', ls(86)); rise('#s19-dr', ls(87))
xin('s19', t0); c(); z += 2
# archive montage answering «لكن لو عايز تعرف ريفالدو كان لاعب عامل إزاي…» (broadcast footage, muted, burned-in caption removed)
MONT = 'assets/montage_goals.mp4'
if 'montB' not in FOOT and os.path.exists(f'{HERE}/{MONT}'):
    ms = round(ls(79) - 0.2, 3); md = 4.6
    body.append(f'<video id="s19-mont" class="clip" src="{MONT}" data-start="{ms:.3f}" data-duration="{md}" data-track-index="4" muted playsinline '
                f'style="position:absolute;left:0;top:0;width:1080px;height:1350px;object-fit:cover;z-index:{z-1};opacity:0"></video>')
    js.append(f'tl.fromTo("#s19-mont",{{opacity:0}},{{opacity:1,duration:0.2}},{ms:.3f}); tl.to("#s19-mont",{{opacity:0,duration:0.55,ease:"power1.in"}},{ms+md-0.6:.3f});')

# s20 scoreboard: 1-0, 1-1, 2-1, 2-2, out
t0, t1 = span(88, 101); c = open_scene('s20', t0, t1, z)
for k, slot in enumerate(['19a', '19b']):
    pp = photo('s20', slot, 'BARÇA v VALENCIA', '17 JUNE 2001', 'VI', 'dolly_in', t0 if k == 0 else ls(93), t1 if k else ls(93), z=1 + k)
    js.append(f'tl.set("#{pp}",{{opacity:0.32}},{t0 if k == 0 else ls(93):.3f});')
    if k: fade(f'#{pp}', ls(93) - 0.2, 0.4, 0.32, 0)
def flap(fid, digits, gold):
    col = 'gold' if gold else ''
    return (f'<div class="flap" id="{fid}">' + ''.join(
        f'<span id="{fid}-{d}" class="{col}" style="position:absolute;opacity:{1 if i == 0 else 0};{"" if gold else "color:var(--white100)"}">{d}</span>'
        for i, d in enumerate(digits)) + '</div>')
body.append('<div id="s20-pl" class="plate" style="left:60px;top:300px;width:960px;height:520px;z-index:20">'
            '<div class="tick tl"></div><div class="tick tr"></div><div class="tick bl"></div><div class="tick br"></div><div class="acc"></div>'
            '<div class="hero code" style="left:calc(50% - 360px);color:var(--white100)">BAR</div>'
            '<div class="hero code" style="left:calc(50% + 360px);color:var(--white100)">VAL</div>'
            '<div class="sboard">' + flap('s20-b', '0123', True) + '<div class="dash">–</div>' + flap('s20-v', '0123', False) + '</div>'
            '<div id="s20-out" class="label" style="position:absolute;left:0;right:0;top:420px;text-align:center;font-size:36px;letter-spacing:12px;color:var(--stampInkLight);opacity:0">OUT OF THE CHAMPIONS LEAGUE</div></div>'
            '<div id="s20-edge" style="position:absolute;left:60px;top:300px;width:960px;height:520px;border:3px solid var(--stampInk);border-radius:10px;opacity:0;z-index:21;box-sizing:border-box"></div>')
fade('#s20-pl', t0 + 0.1, 0.4)
def flip(fid, frm, to, t):
    js.append(f'tl.to("#{fid}-{frm}",{{scaleY:0,opacity:0,duration:0.09,ease:"power2.in"}},{t:.3f});')
    js.append(f'tl.fromTo("#{fid}-{to}",{{scaleY:0,opacity:1}},{{scaleY:1,opacity:1,duration:0.09,ease:"power2.out"}},{t+0.09:.3f});')
flip('s20-b', 0, 1, ls(91)); flip('s20-v', 0, 1, ls(92) + 0.3); flip('s20-b', 1, 2, ls(96)); flip('s20-v', 1, 2, ls(98))
fade('#s20-out', ls(101) + 0.3, 0.3); fade('#s20-edge', ls(101) + 0.3, 0.3)
xin('s20', t0); c(); z += 2

# s21 ACTION PEAK: minute 87 → chest → air → bicycle kick (freeze, silence) → GOAL flash + shake → 3-2
t0, t1 = span(102, 111); c = open_scene('s21', t0, t1, z, 'var(--bgDeep)')
body.append('<div id="s21-shake" style="position:absolute;inset:0">')
p_chest = photo('s21', '19c', 'DE BOER’S BALL · CHEST CONTROL', '17 JUNE 2001', 'VI', 'dolly_in', ls(103), ls(105), z=2)
KICK = FOOT.get('kick')
if KICK:   # broadcast footage of the kick (speed-ramped, freeze in the silence) sits just below this scene
    js.append(f'tl.fromTo("#{p_chest}",{{opacity:0,x:120}},{{opacity:1,x:0,duration:0.18,ease:"cubic.out"}},{ls(103)-0.08:.3f});')
    js.append(f'tl.to("#{p_chest}",{{opacity:0,duration:0.12}},{KICK["start"]:.3f}); tl.set("#s21-fill",{{opacity:0}},{KICK["start"]+0.12:.3f});')
else:
    p_air = photo('s21', '19d', 'THE BALL IN THE AIR', '17 JUNE 2001', 'VI', 'zoom_in', ls(105), ls(106), z=3)
    p_kick = photo('s21', '19e', 'THE OVERHEAD KICK', '17 JUNE 2001 · 87’', 'VI', 'zoom_in', ls(106), t1, z=4)
    for pp, tt in ((p_chest, ls(103)), (p_air, ls(105)), (p_kick, ls(106))):
        js.append(f'tl.fromTo("#{pp}",{{opacity:0,x:120}},{{opacity:1,x:0,duration:0.18,ease:"cubic.out"}},{tt-0.08:.3f});')
    # freeze: stop the kick photo's camera during the inserted silence (counter-scale to hold)
    js.append(f'tl.to("#{p_kick}-cam",{{scale:1.16,duration:0.06,ease:"none"}},{le(106):.3f});')
body.append('</div>')
body.append('<div class="center-col" style="top:150px;z-index:20"><div id="s21-min" class="serif-i gold" style="font-size:200px;opacity:0;padding:0 .14em">87’</div></div>')
punch('#s21-min', ls(102), 1.25)
js.append(f'tl.to("#s21-min",{{opacity:0,duration:0.3}},{ls(103)+0.6:.3f});')
body.append('<div id="s21-flash" style="position:absolute;inset:0;background:#fff;opacity:0;z-index:40"></div>')
js.append(f'tl.fromTo("#s21-flash",{{opacity:0}},{{opacity:0.55,duration:0.05,ease:"none"}},{ls(108):.3f});')
js.append(f'tl.to("#s21-flash",{{opacity:0,duration:0.12,ease:"none"}},{ls(108)+0.05:.3f});')
rng = random.Random(87)
kf = ','.join('{x:%d,y:%d,duration:0.035}' % (rng.randint(-34, 34), rng.randint(-28, 28)) for _ in range(16)) + ',{x:0,y:0,duration:0.06}'
for tgt in (['#s21-shake'] + (['#ft-kick'] if KICK else [])):
    js.append(f'tl.to("{tgt}",{{keyframes:[{kf}],ease:"none"}},{ls(108):.3f});')
    js.append(f'tl.fromTo("{tgt}",{{scale:1.05}},{{scale:1.0,duration:0.6,ease:"cubic.out"}},{ls(108):.3f});')
body.append('<div id="s21-pl" class="plate" style="left:110px;top:760px;width:860px;height:260px;opacity:0;z-index:30">'
            '<div class="acc"></div><div class="sboard" style="top:46px">' + flap('s21-b', '23', True) + '<div class="dash">–</div>' + flap('s21-v', '2', False) + '</div>'
            '<div class="hero" style="position:absolute;left:70px;top:76px;font-size:96px;color:var(--white100)">BAR</div>'
            '<div class="hero" style="position:absolute;right:70px;top:76px;font-size:96px;color:var(--white100)">VAL</div></div>')
fade('#s21-pl', ls(109) - 0.35, 0.2)
flip('s21-b', 2, 3, ls(109))
body.append('<div class="center-col" style="top:1030px;z-index:30"><div id="s21-ht" class="label" style="font-size:34px;letter-spacing:14px;color:var(--gold300);opacity:0">HAT-TRICK · CHAMPIONS LEAGUE</div></div>')
rise('#s21-ht', ls(110))
xin('s21', t0); c(); z += 2

# s22 Camp Nou erupts
t0, t1 = span(112, 115); c = open_scene('s22', t0, t1, z)
photo('s22', '20', 'CAMP NOU', '17 JUNE 2001', 'VI', 'crane_up', t0, t1)
xin('s22', t0); c(); z += 2

# s23 Yokohama 2002 (Brazil tricolour bar)
t0, t1 = span(116, 121); c = open_scene('s23', t0, t1, z)
p21 = photo('s23', '21', 'RIVALDO · Nº 10 · WORLD CUP', 'YOKOHAMA · 30 JUNE 2002', 'VII', 'dolly_in', t0, t1)
BG = FOOT.get('bra_goal')
if BG:   # a 2002 World Cup goal plays under the scene; the final's own label waits for «البرازيل ضد ألمانيا»
    be = BG['start'] + BG['dur']
    js.append(f'tl.to("#{p21}",{{opacity:0,duration:0.15}},{BG["start"]+0.15:.3f}); tl.set("#s23-fill",{{opacity:0}},{BG["start"]+0.3:.3f});')
    js.append(f'tl.set("#s23-fill",{{opacity:1}},{be-0.35:.3f}); tl.to("#{p21}",{{opacity:1,duration:0.35}},{be-0.35:.3f});')
body.append('<div class="brbar" style="z-index:25"><i style="background:var(--brGreen)"></i><i style="background:var(--brYellow)"></i><i style="background:var(--brBlue)"></i></div>'
            '<div class="scrim" style="top:760px;height:330px;z-index:19"></div><div class="center-col" style="top:830px;z-index:20"><div id="s23-m" class="mono" style="font-size:24px;color:var(--textSecondary);opacity:0">YOKOHAMA · 30 JUNE 2002 · FINAL</div>'
            '<div id="s23-s" class="hero" style="font-size:150px;color:var(--white100);opacity:0">BRA 2–0 GER</div></div>')
rise('#s23-m', ls(119) - 0.2 if BG else ls(118)); punch('#s23-s', ls(120) + 0.3, 1.2)
xin('s23', t0); c(); z += 2

# s24 Van Gaal returns; Rivaldo leaves
t0, t1 = span(122, 124); c = open_scene('s24', t0, t1, z)
vg2 = photo('s24', '22', 'VAN GAAL RETURNS', 'BARCELONA · 2002', 'V', 'pan_left', t0, ls(124), optional=True) or photo('s24', '2', 'VAN GAAL', '', 'V', 'dolly_in', t0, ls(124))
lv = photo('s24', '23', 'RIVALDO · BARÇA', '1997–2002', 'EP', 'dolly_out', ls(124), t1, z=3)
fade(f'#{lv}', ls(124) - 0.2, 0.3, 1, 0)
js.append(f'tl.to("#{vg2}",{{opacity:0,duration:0.3}},{ls(124)-0.2:.3f});')
body.append('<div id="s24-dark" style="position:absolute;inset:0;background:var(--ink);opacity:0;z-index:6"></div>')
js.append(f'tl.to("#s24-dark",{{opacity:0.72,duration:1.2,ease:"power1.in"}},{ls(124)+0.5:.3f});')
xin('s24', t0); c(); z += 2

# s25 recap montage
t0, t1 = span(125, 129); c = open_scene('s25', t0, t1, z)
items = [('5', 'YOUNG RIVALDO', 'I', 125), ('1', 'BALLON D’OR', 'IV', 127), ('19e', 'THE OVERHEAD KICK', 'VI', 128), ('21f', 'WORLD CUP 2002', 'VII', 129)]
items = [x for x in items if photo_file(x[0])] or items
for k, (slot, lab, act, li) in enumerate(items):
    tt = t0 if k == 0 else ls(li)
    pp = photo('s25', slot, lab, '', act, 'dolly_in', tt, (ls(items[k+1][3]) if k + 1 < len(items) else t1) + 0.4, z=2 + k)
    if k: fade(f'#{pp}', tt - 0.15, 0.3, 1, 0)
xin('s25', t0); c(); z += 2

# s26 title
t0, t1 = span(130, 132); c = open_scene('s26', t0, t1, z)
photo('s26', '23', 'RIVALDO · BARÇA', '1997–2002', 'EP', 'static', t0, t1)
body.append('<div class="lowfade"></div><div class="scrim" style="top:560px;height:500px;z-index:19"></div><div class="center-col" style="top:600px;z-index:20"><div id="s26-n" class="hero gold" style="font-size:240px">RIVALDO</div>'
            '<div id="s26-ar" class="ar-title" style="opacity:0">ريفالدو</div></div>')
js.append(f'tl.fromTo("#s26-n",{{opacity:0,y:30}},{{opacity:1,y:0,duration:0.5,ease:"cubic.out"}},{ls(131):.3f});')
rise('#s26-ar', ls(131) + 0.4)
xin('s26', t0); c(); z += 2

# s27 next episode: Ronaldinho
t0, t1 = span(133, 137); c = open_scene('s27', t0, t1, z)
has24 = photo('s27', '24', 'RONALDINHO', 'PRESENTED AT BARÇA · 2003', 'EP', 'zoom_in', t0, t1, optional=True)
if has24:  # silhouette until the name is spoken, then the reveal (the shirt already carries his name)
    body.append('<div id="s27-dark" style="position:absolute;inset:0;background:var(--ink);opacity:0.86;z-index:6"></div><div class="scrim" style="top:60px;height:260px;z-index:19"></div>')
    js.append(f'tl.to("#s27-dark",{{opacity:0.08,duration:0.35,ease:"cubic.out"}},{ls(137)-0.05:.3f});')
body.append(f'<div class="center-col" style="top:{150 if has24 else 560}px;z-index:20"><div id="s27-k" class="label" style="font-size:30px;letter-spacing:14px;color:var(--textSecondary);opacity:0">NEXT · EPISODE 3</div></div>'
            f'<div class="center-col" style="top:{800 if has24 else 630}px;z-index:20"><div id="s27-n" class="hero gold" style="font-size:190px;opacity:0">RONALDINHO</div></div>')
rise('#s27-k', ls(133))
if not has24: punch('#s27-n', ls(137), 1.25)
xin('s27', t0); c(); z += 2

# s28 end card (DS 5.9)
t0, t1 = BODY_END - 0.3, TOTAL
c = open_scene('s28', t0, t1, z, 'var(--bgDeep)')
badge = 'assets/badge.png' if os.path.exists(f'{HERE}/assets/badge.png') else None
body.append('<div class="center-col" style="top:330px">' +
            (f'<img src="{badge}" style="height:190px">' if badge else '<div class="mono" style="height:190px;width:190px;margin:0 auto;border:1.5px dashed var(--char500);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;color:var(--textDim)">PAGE BADGE</div>') +
            '<div id="s28-v" class="hero gold" style="font-size:210px;margin-top:60px;opacity:0">VIVA BARÇA</div>'
            '<div class="splitrule"><i style="background:var(--fcbBlue)"></i><i style="background:var(--fcbGarnet)"></i></div>'
            '<div class="label" style="font-size:26px;letter-spacing:12px;color:var(--textSecondary);margin-top:28px">BARCELONA ARMY EGYPT</div></div>')
js.append(f'tl.fromTo("#s28-v",{{opacity:0,y:40}},{{opacity:1,y:0,duration:0.6,ease:"cubic.out"}},{t0+0.6:.3f});')
xin('s28', t0); c()

# ======================================================================= archive footage inserts
for k_, (name, f) in enumerate(sorted(FOOT.items(), key=lambda kv: kv[1]['start'])):
    hz = SCENE_Z[f['host']]; zz = hz + 1 if f['mode'] == 'over' else hz - 1
    trk = 4 if k_ % 2 == 0 else 13   # alternate rows so cross-faded inserts never share a track
    st, du = f['start'], f['dur']
    body.append(f'<video id="ft-{name}" class="clip" src="{f["src"]}" data-start="{st:.3f}" data-duration="{du:.3f}" data-track-index="{trk}" muted playsinline '
                f'style="position:absolute;left:0;top:0;width:1080px;height:1350px;object-fit:cover;z-index:{zz};opacity:{0 if f["fin"] > 0 else 1}"></video>')
    if f['fin'] > 0: js.append(f'tl.fromTo("#ft-{name}",{{opacity:0}},{{opacity:1,duration:{f["fin"]}}},{st:.3f});')
    if f['fout'] > 0: js.append(f'tl.to("#ft-{name}",{{opacity:0,duration:{f["fout"]},ease:"power1.in"}},{st + du - f["fout"]:.3f});')
    if f.get('credit'):   # archive source credit, top right (the chapter marker holds top left)
        body.append(f'<div id="cr-{name}" class="clip mono" data-start="{st:.3f}" data-duration="{du:.3f}" data-track-index="{7 if trk == 4 else 14}" '
                    f'style="position:absolute;right:34px;top:306px;z-index:890;font-size:19px;letter-spacing:3px;color:var(--textSecondary);opacity:0">{html.escape(f["credit"])}</div>')
        js.append(f'tl.fromTo("#cr-{name}",{{opacity:0}},{{opacity:0.85,duration:0.3}},{st + 0.1:.3f}); tl.to("#cr-{name}",{{opacity:0,duration:0.2}},{st + du - 0.25:.3f});')

# ======================================================================= chapter markers
HIDE = [(span(102, 111)[0], span(102, 111)[1])]  # hide during the action peak
for k, a in enumerate(NUMBERED):
    st = ls(a[3]) - 0.2
    en = (ls(NUMBERED[k + 1][3]) - 0.2) if k + 1 < len(NUMBERED) else BODY_END - 0.3
    ticks = ''.join(f'<i class="{"now" if j == k else ("past" if j < k else "")}"></i>' for j in range(len(NUMBERED)))
    cid = f'ch{k}'
    body.append(f'<div id="{cid}" class="clip chapter" data-start="{st:.3f}" data-duration="{en-st:.3f}" data-track-index="5" style="z-index:900">'
                f'<span class="num">{a[1]}</span><span class="name">{a[2]}</span><div class="rule" id="{cid}-r"></div><div class="ticks">{ticks}</div></div>')
    js.append(f'tl.fromTo("#{cid}",{{opacity:0,y:10}},{{opacity:1,y:0,duration:0.45,ease:"cubic.out"}},{st+0.15:.3f});')
    js.append(f'tl.fromTo("#{cid}-r",{{scaleX:0}},{{scaleX:1,duration:0.5,ease:"cubic.out"}},{st+0.3:.3f});')
    for hs, he in HIDE:
        if st < hs < en:
            js.append(f'tl.to("#{cid}",{{opacity:0,duration:0.25}},{hs:.3f}); tl.to("#{cid}",{{opacity:1,duration:0.4}},{he-0.3:.3f});')
    for hs, he in [(span(58, 61)[0], span(58, 61)[1]), (span(65, 67)[0], span(65, 67)[1]), (span(24, 28)[0], span(24, 28)[1])]:
        if st <= hs < en:
            js.append(f'tl.to("#{cid}",{{opacity:0,duration:0.25}},{hs+0.2:.3f}); tl.to("#{cid}",{{opacity:1,duration:0.4}},{he-0.2:.3f});')

# ======================================================================= film burns at act changes
for k, a in enumerate(NUMBERED):
    t = ls(a[3]) - 0.3
    fid = f'burn{k}'
    body.append(f'<div id="{fid}" class="clip burn" data-start="{t:.3f}" data-duration="0.9" data-track-index="6" style="z-index:950"></div>')
    js.append(f'tl.fromTo("#{fid}",{{opacity:0,x:-500}},{{opacity:0.85,x:0,duration:0.35,ease:"power2.out"}},{t:.3f}); tl.to("#{fid}",{{opacity:0,x:400,duration:0.5,ease:"power2.in"}},{t+0.35:.3f});')

# ======================================================================= subtitles (DS §8, burned in)
SUPPRESS = {L[67]['text'].strip('.').strip()}  # «لأ» is the on-screen statement itself
for k, s in enumerate(SUBS):
    if len(s['lines']) == 1 and s['lines'][0].strip('.').strip() in SUPPRESS: continue
    sid = f'sub{k}'
    lines = ''.join(f'<div class="sl"><span>{html.escape(x)}</span></div>' for x in s['lines'])
    body.append(f'<div id="{sid}" class="clip subs" data-start="{s["start"]:.3f}" data-duration="{s["end"]-s["start"]:.3f}" data-track-index="8" style="z-index:1000">{lines}</div>')

# ======================================================================= page badge (DS §5.4) + centre name watermark
BADGE = 'assets/badge.png'
if os.path.exists(f'{HERE}/{BADGE}'):
    bend = BODY_END - 0.3                                       # the end card carries its own badge
    body.append(f'<img id="badge" class="clip" src="{BADGE}" data-start="0" data-duration="{bend:.3f}" data-track-index="11" '
                f'style="position:absolute;right:34px;top:120px;height:170px;z-index:940;opacity:0.85">')
    body.append(f'<div id="wm" class="clip label" data-start="0" data-duration="{bend:.3f}" data-track-index="12" '
                f'style="position:absolute;left:0;right:0;top:640px;text-align:center;z-index:945;font-size:44px;letter-spacing:16px;'
                f'color:var(--white100);opacity:0.13;pointer-events:none">BARCELONA ARMY EGYPT</div>')
    # hidden on the clean typographic beats: the «لأ.» statement, the darkroom reveal, the title
    s15_end = span(58, 61 if HAS17 else 62)[1]
    hides = [span(65, 67), (dstart if os.path.exists(f'{HERE}/{DARK}') else ls(61), s15_end), span(130, 132),
             span(68, 78)]   # tactics board: the badge would sit on Rivaldo's face in the photo
    # the centre name sits on footage and photos (what gets ripped), never across the type plates
    g2 = FOOT.get('goal2')
    wm_hides = hides + [span(4, 7), span(24, 28), span(52, 55), span(56, 57), span(58, 61 if HAS17 else 62), span(68, 78),
                        (ls(49) - 0.1, span(47, 51)[1]), (ls(83) - 0.1, g2['start'] if g2 else span(88, 101)[1])]
    if g2: wm_hides.append((g2['start'] + g2['dur'], span(88, 101)[1]))
    def merged(ws):
        out = []
        for a, b in sorted(ws):
            if out and a <= out[-1][1] + 0.5: out[-1] = (out[-1][0], max(out[-1][1], b))
            else: out.append((a, b))
        return out
    for el, op, ws in (('#badge', 0.85, hides), ('#wm', 0.13, wm_hides)):
        for a, b in merged(ws):
            js.append(f'tl.to("{el}",{{opacity:0,duration:0.3}},{a + 0.1:.3f}); tl.to("{el}",{{opacity:{op},duration:0.4}},{b - 0.1:.3f});')

# ======================================================================= grain overlay (deterministic jitter)
body.append(f'<div id="grain" class="clip" data-start="0" data-duration="{TOTAL}" data-track-index="9" style="z-index:980;position:absolute;inset:-200px;pointer-events:none;opacity:0.085;mix-blend-mode:overlay;background-image:url(assets/grain.png)"></div>')
rng2 = random.Random(1999)
cyc = 12; fr = 2 / FPS
kfs = ','.join('{x:%d,y:%d,duration:%.4f,ease:"steps(1)"}' % (rng2.randint(-150, 150), rng2.randint(-150, 150), fr) for _ in range(cyc))
rep = max(0, int(TOTAL // (cyc * fr)) - 1)
js.append(f'tl.to("#grain",{{keyframes:[{kfs}],repeat:{rep}}},0);')

# ======================================================================= audio
AUDIO = 'assets/mix.wav' if os.path.exists(f'{HERE}/assets/mix.wav') else 'assets/vo_edit.wav'
import subprocess
ADUR = min(TOTAL, float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f'{HERE}/{AUDIO}'],capture_output=True,text=True).stdout))

page = f'''<!doctype html>
<html lang="ar">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1350">
<title>Rivaldo · Barcelona Army Egypt · Ep 2</title>
<script src="vendor/gsap.min.js"></script>
<link rel="stylesheet" href="fonts/fonts.css">
<link rel="stylesheet" href="tokens.css">
<link rel="stylesheet" href="ep2.css">
</head>
<body>
<div id="root" data-composition-id="rivaldo" data-width="1080" data-height="1350" data-duration="{TOTAL}">
<audio id="mix" src="{AUDIO}" data-start="0" data-duration="{ADUR:.3f}" data-track-index="10" data-volume="1"></audio>
{chr(10).join(body)}
</div>
<script>
window.__timelines = window.__timelines || {{}};
const tl = gsap.timeline({{ paused: true }});
{chr(10).join(js)}
window.__timelines["rivaldo"] = tl;
</script>
</body>
</html>
'''
open(f'{HERE}/index.html', 'w', encoding='utf-8').write(page)
missing = sorted({x for x in __import__('re').findall(r'PHOTO #([\w]+)', page)})
print(f'index.html written: {TOTAL}s, {len(body)} elements, {len(js)} tweens; placeholders for photos: {", ".join(missing) or "none"}; audio={AUDIO}')

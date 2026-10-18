#!/usr/bin/env python3
"""Original sound design for Episode 2 (DS §7 + OpenMontage skills/creative/sound-design.md).

Everything is synthesised here; no third-party music or samples (copyright-safe for Facebook).
Bed: drone pad low-passed ~900 Hz; D minor through the struggle, D major at the Ballon d'Or and the goal;
a low pulse ostinato (108 / 116 bpm) for the momentum sections; silence before every impact.
Outputs: assets/sfx.wav (48 kHz stereo) and assets/bed_drone.wav (the v1 drone bed, superseded by score.py).
EP2_NO_MONTAGE=1 → assets/sfx_nomontage.wav without the montage SFX. mix.py ducks + masters.
"""
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt

HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE)
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
SR = 48000
BODY_END = round(L[-1]['end'] + 0.4, 2); TOTAL = round(BODY_END + 4.6, 2)
N = int(TOTAL * SR)
ls = lambda i: L[i]['start']; le = lambda i: L[i]['end']
rng = np.random.default_rng(1999)

def hz(note):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    n, o = note[:-1], int(note[-1]); return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)

def env(n, a, r):
    e = np.ones(n); a = min(int(a * SR), n // 2); r = min(int(r * SR), n // 2)
    if a: e[:a] = np.linspace(0, 1, a) ** 2
    if r: e[-r:] *= np.linspace(1, 0, r) ** 2
    return e

def pad(dur, notes, seed=0, bright=900.0):
    """Additive drone pad: harmonics rolled off around `bright` Hz (implicit low-pass), detuned stereo pair, slow breathing."""
    n = int(dur * SR); t = np.arange(n) / SR; out = np.zeros((n, 2))
    r = np.random.default_rng(seed)
    for k, nt in enumerate(notes):
        f0 = hz(nt)
        for ch, cents in ((0, -4), (1, 4)):
            f = f0 * 2 ** (cents / 1200); ph = r.uniform(0, 2 * np.pi)
            sig = np.zeros(n)
            h = 1
            while h * f < 2000:
                roll = 1.0 / (1.0 + (h * f / bright) ** 4)
                sig += roll / h * np.sin(2 * np.pi * h * f * t + ph * h)
                h += 1
            lfo = 0.75 + 0.25 * np.sin(2 * np.pi * (0.07 + 0.03 * k) * t + ph)
            out[:, ch] += sig * lfo
    return out / max(1, len(notes))

def pluck(f, dur=0.5, dec=0.22):
    n = int(dur * SR); t = np.arange(n) / SR
    s = (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t)) * np.exp(-t / dec)
    s += 0.6 * np.sin(2 * np.pi * (f / 2) * t) * np.exp(-t / 0.12)
    return np.tanh(1.6 * s) * 0.7

def noise(n): return rng.standard_normal(n)

def band(x, lo, hi):
    sos = butter(2, [lo, hi], btype='band', fs=SR, output='sos'); return sosfilt(sos, x)

def lowp(x, fc):
    sos = butter(2, fc, btype='low', fs=SR, output='sos'); return sosfilt(sos, x)

bed = np.zeros((N, 2)); sfx = np.zeros((N, 2))

def put(buf, t, sig, gain_db=0.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    if sig.ndim == 1: sig = np.stack([sig * (1 - max(0, pan)), sig * (1 + min(0, pan))], 1)
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i] * 10 ** (gain_db / 20)

# ------------------------------------------------------------------ bed
def seg(t0, t1, notes, db, a=0.8, r=0.8, seed=0, bright=900.0):
    s = pad(t1 - t0, notes, seed, bright) * env(int((t1 - t0) * SR), a, r)[:, None]
    put(bed, t0, s, db)

def pulse(t0, t1, bpm, roots, db, beats_per_chord=4):
    b = 60.0 / bpm; k = 0; t = t0
    while t < t1 - 0.05:
        f = hz(roots[(k // beats_per_chord) % len(roots)])
        acc = 0.0 if k % 4 == 0 else -4.0
        put(bed, t, pluck(f), db + acc); t += b; k += 1

S1 = 9.6
seg(0.0, S1, ['D2', 'A2'], -16, a=0.05, r=0.9)                                   # cold open: frame 0 already has sound
seg(S1 - 0.3, ls(8) + 0.4, ['D2'], -20, a=0.4, r=0.6, seed=1)
seg(ls(8), ls(24) - 0.5, ['D2', 'D3', 'F3', 'A3'], -18, seed=2)                   # I: D minor
# 1989: bed out from ls(24)-0.5 → ls(26) (silence before the impact)
seg(ls(26) + 0.6, ls(29), ['D2'], -24, seed=3)
seg(ls(29) - 0.2, ls(33) - 0.4, ['Bb2', 'D3', 'F3'], -18, seed=4)                 # the mother: Bb major warmth
prog = ['D2', 'Bb1', 'F2', 'C2']
seg(ls(33) - 0.4, ls(46), ['D2', 'A2', 'D3', 'F3'], -21, seed=5)                  # II: rise
pulse(ls(33) - 0.3, ls(52) - 0.3, 108, prog, -14)
seg(ls(46) - 0.2, ls(52) - 0.2, ['F2', 'C3', 'F3', 'A3'], -19, seed=6, bright=1100) # III: Barça arrives, brighter
seg(ls(52) - 0.3, le(58) + 0.1, ['A1', 'A2', 'E3'], -19, seed=7)                 # IV: suspense pedal on A
# silence (inserted 0.8 s) before «بيكهام: 154»
seg(ls(59) - 0.05, ls(61) - 0.05, ['D2', 'D3', 'F3', 'A3'], -18, a=0.1, seed=8)
seg(ls(61) - 0.05, ls(65) - 0.3, ['D2', 'D3', 'F#3', 'A3', 'D4'], -15, a=0.25, seed=9, bright=1300)  # D MAJOR on «يفوز»
# «صح؟ … لأ.»: bed fully out, then the cold Act V drone
seg(ls(68) - 0.4, ls(79) - 0.4, ['D2', 'A2', 'Eb3'], -21, seed=10, bright=700)   # V: the bench (minor 2nd rub)
seg(ls(79) - 0.4, ls(102), ['D2', 'D3', 'F3', 'A3'], -20, seed=11)               # VI: one night
pulse(ls(81), ls(102), 116, prog, -13)
pulse(ls(102), le(106) - 0.02, 232, ['D2'], -12, beats_per_chord=999)            # double-time into the kick
# riser from the minute 87 to the freeze
rd = le(106) - ls(102); n = int(rd * SR); t = np.arange(n) / SR
rise = (band(noise(n), 300, 6000) * (t / rd) ** 2 * 0.25 + 0.3 * np.sin(2 * np.pi * (110 + 660 * (t / rd) ** 2) * t) * (t / rd) ** 2)
put(bed, ls(102), np.stack([rise, rise], 1), -10)
# freeze: total silence between le(106) and «مقصية»
seg(ls(108), ls(116) - 0.3, ['D2', 'A2', 'D3', 'F#3', 'A3', 'D4'], -13, a=0.05, r=2.5, seed=12, bright=1400)  # GOAL: D major
seg(ls(116) - 0.3, ls(122), ['D2', 'A2', 'F#3', 'A3', 'E4'], -18, seed=13, bright=1100)   # VII: Yokohama
seg(ls(122) - 0.2, ls(125), ['D2', 'A2', 'F3'], -21, seed=14)                    # Van Gaal returns: back to minor
seg(ls(125) - 0.2, ls(130) + 0.5, ['Bb1', 'F2', 'D3', 'F3', 'Bb3'], -19, seed=15) # recap rising
seg(ls(130) + 0.3, le(130) + 0.1, ['F2', 'C3', 'A3'], -21, seed=16)
seg(ls(131) - 0.03, TOTAL - 0.3, ['D2', 'A2', 'D3', 'F#3', 'A3', 'E4'], -16, a=0.08, r=3.5, seed=17, bright=1300)  # title → end card

# ------------------------------------------------------------------ SFX vocabulary
def whoosh(d=0.45, lo=250, hi=5000, rev=False):
    n = int(d * SR); t = np.arange(n) / SR; x = noise(n)
    out = np.zeros(n); seglen = n // 12
    for k in range(12):  # swept band
        fc = lo * (hi / lo) ** (k / 11); a, b = k * seglen, (k + 1) * seglen if k < 11 else n
        out[a:b] = band(x, max(60, fc * 0.6), min(SR / 2 - 100, fc * 1.6))[a:b]
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    s = out * e * 0.5
    return s[::-1] if rev else s

def hit(f0=58, f1=34, d=1.4, noise_amt=0.4):
    n = int(d * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.08); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t / (d / 3.2)) + noise_amt * lowp(noise(n), 900) * np.exp(-t / 0.06)
    return np.tanh(1.5 * s) * 0.9

def kick():  # the ball
    n = int(0.25 * SR); t = np.arange(n) / SR
    f = 50 + 90 * np.exp(-t / 0.02); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07)
    s[: int(0.004 * SR)] += band(noise(int(0.004 * SR)), 2000, 8000) * 0.6
    return s * 0.9

def tick(f=2200, d=0.03):
    n = int(d * SR); t = np.arange(n) / SR; return np.sin(2 * np.pi * f * t) * np.exp(-t / 0.006) * 0.5

def flapclick():
    a = band(noise(int(0.012 * SR)), 1500, 7000) * np.exp(-np.arange(int(0.012 * SR)) / SR / 0.003)
    s = np.zeros(int(0.06 * SR)); s[: len(a)] += a; s[int(0.022 * SR): int(0.022 * SR) + len(a)] += 0.7 * a
    return s * 0.8

def shimmer(d=3.0):
    n = int(d * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for k, nt in enumerate(['D6', 'F#6', 'A6', 'D7']):
        s += np.sin(2 * np.pi * hz(nt) * t + k) * (0.6 + 0.4 * np.sin(2 * np.pi * (5 + k) * t))
    return s * env(n, 0.6, 1.8) * 0.12

def crowd(d=6.0, big=True):
    n = int(d * SR); t = np.arange(n) / SR
    x = band(noise(n), 350, 2600) * 0.5 + band(noise(n), 120, 400) * 0.35
    am = 1.0
    for k in range(6): am = am * (0.85 + 0.15 * np.sin(2 * np.pi * rng.uniform(0.7, 3.5) * t + rng.uniform(0, 6)))
    e = np.minimum(1, t / (0.35 if big else 0.6)) * np.exp(-np.maximum(0, t - (1.8 if big else 0.8)) / (2.2 if big else 0.9))
    return x * am * e * (1.0 if big else 0.45)

# placement (times mirror build.py; whoosh starts 15 ms early per the OM skill)
acts = [4, 33, 42, 52, 65, 79, 116, 122]
for a in acts: put(sfx, ls(a) - 0.3 - 0.015, whoosh(0.6, 200, 4000), -16)                     # film burns
put(sfx, ls(6) - 0.25, whoosh(0.9, 200, 5000, rev=True), -15)                                   # rewind
for k in range(9): put(sfx, ls(6) + k * 0.17, tick(1800 + 60 * k), -22)
put(sfx, ls(15), hit(70, 45, 0.6, 0.2), -20)                                                    # name
put(sfx, ls(16) + 1.3, tick(1400, 0.06), -18)                                                   # Recife dot
put(sfx, ls(24) + 0.1, hit(50, 30, 2.2, 0.15), -16)                                             # 1989
for k in range(4): put(sfx, ls(33 + k) - 0.135, whoosh(0.35, 400, 6000), -20, pan=0.3)          # clubs slide
put(sfx, ls(38) + 0.2, hit(80, 50, 0.5, 0.2), -22)
put(sfx, ls(44) + 0.28, whoosh(0.5, 300, 5000), -18)
put(sfx, ls(49) - 0.015, whoosh(0.5, 200, 3000), -20)
put(sfx, ls(54), hit(64, 40, 0.8, 0.3), -19)                                                    # December 1999
put(sfx, ls(57) + 0.6, hit(80, 50, 0.5, 0.2), -22)                                              # THE TREBLE
put(sfx, ls(59) + 1.25, hit(90, 55, 0.35, 0.1), -20); put(sfx, ls(60) + 1.55, hit(64, 38, 1.0, 0.25), -15)  # counters lock
put(sfx, ls(61) + 0.2, shimmer(3.2), -6)                                                        # darkroom reveal
for tt in (ls(63) - 0.115, ls(64) - 0.165): put(sfx, tt, whoosh(0.4, 300, 5000), -20)
put(sfx, ls(67), hit(55, 30, 1.8, 0.5), -10)                                                    # «لأ.»
put(sfx, ls(70) + 1.4, tick(1200, 0.05), -18); put(sfx, ls(71) + 1.585, whoosh(0.55, 300, 3000), -22); put(sfx, ls(72), tick(1600, 0.05), -18)
put(sfx, ls(76) - 0.115, whoosh(0.4, 200, 2500), -18); put(sfx, ls(76) + 0.1, hit(48, 30, 1.2, 0.3), -17)  # «استبعد»
put(sfx, ls(81), hit(64, 40, 0.8, 0.3), -19); put(sfx, ls(83) - 0.015, whoosh(0.5, 200, 3000), -20)
put(sfx, ls(90) + 0.55, kick(), -14); put(sfx, ls(91), flapclick(), -12); put(sfx, ls(91) + 0.05, crowd(2.5, False), -14)
put(sfx, ls(92) + 0.3, flapclick(), -12)
put(sfx, ls(94) + 0.15, kick(), -14); put(sfx, ls(95), crowd(2.5, False), -14); put(sfx, ls(96), flapclick(), -12)
put(sfx, ls(98), flapclick(), -12); put(sfx, ls(101) + 0.3, hit(50, 32, 1.4, 0.3), -16)         # OUT
put(sfx, ls(102), hit(70, 45, 0.6, 0.2), -18)                                                   # 87’
put(sfx, ls(103) - 0.095, whoosh(0.3, 500, 7000), -20); put(sfx, ls(105) - 0.095, whoosh(0.3, 500, 7000), -20)
put(sfx, ls(106) - 0.095, whoosh(0.3, 500, 7000), -18)
put(sfx, ls(107) - 0.015, whoosh(0.55, 150, 6000), -12); put(sfx, ls(107) + 0.18, kick(), -8)  # «مقصية»
put(sfx, ls(108), hit(58, 32, 2.6, 0.6), -7); put(sfx, ls(108) + 0.02, crowd(9.0, True), -7)   # «جول»
put(sfx, ls(109), flapclick(), -10)
put(sfx, ls(118), shimmer(2.5), -10); put(sfx, ls(120) + 0.3, hit(70, 45, 0.7, 0.2), -18)
put(sfx, ls(131), hit(60, 36, 1.6, 0.3), -14); put(sfx, ls(131) + 0.1, shimmer(3.0), -8)       # title
put(sfx, ls(137), hit(70, 45, 0.7, 0.2), -16)                                                   # RONALDINHO
put(sfx, BODY_END + 0.3, shimmer(3.5), -9)
MAN = f'{HERE}/assets/footage/manifest.json'
FOOT = json.load(open(MAN)) if os.path.exists(MAN) and os.environ.get('EP2_NO_MONTAGE') != '1' else {}
if FOOT:                                                     # archive footage inserts (footage.py): cuts, goals, the freeze
    LEVEL = {'open_a': -21, 'open_b': -17, 'showA': -16, 'montB': -15, 'replay': -20, 'recap_kick': -22, 'bra_goal': -17, 'val_shirt': -19}
    freezes = [t for f in FOOT.values() for k, t in f['events'] if k == 'freeze']
    for name, f in FOOT.items():
        for k, t in f['events']:
            if k == 'cut' and name in ('open_a', 'showA', 'montB'): put(sfx, t - 0.015, whoosh(0.3, 500, 7000), -23 if name == 'showA' else -21)
            elif k == 'goal' and name in LEVEL: put(sfx, t, crowd(2.2, False), LEVEL[name])
            elif k == 'applause': put(sfx, t, crowd(1.8, False), -22)
    for t in freezes:                                         # the picture freezes on «الدكة»: the room goes dead, one hit
        i = int(t * SR); nf = int(0.02 * SR); sfx[i:i + nf] *= np.linspace(1, 0, nf)[:, None]; sfx[i + nf:i + int(1.5 * SR)] = 0
        put(sfx, t, hit(55, 30, 1.6, 0.4), -13)
elif os.environ.get('EP2_NO_MONTAGE') != '1' and os.path.exists(f'{HERE}/assets/montage_goals.mp4'):        # single archive montage (s19)
    m0 = ls(79) - 0.2
    for dt in (0.0, 0.7, 1.4, 2.1): put(sfx, m0 + dt - 0.015, whoosh(0.3, 500, 7000), -21)
    put(sfx, m0 + 2.6, kick(), -15); put(sfx, m0 + 4.25, crowd(2.2, False), -15)                                                      # end card

# ------------------------------------------------------------------ write (bed low-passed ~900 Hz overall, DS §7)
for ch in range(2): bed[:, ch] = lowp(bed[:, ch], 1400)
fo = int(1.2 * SR); bed[-fo:] *= np.linspace(1, 0, fo)[:, None]; sfx[-fo:] *= np.linspace(1, 0, fo)[:, None]
SUF = '_nomontage' if os.environ.get('EP2_NO_MONTAGE') == '1' else ''
for name, buf in (('bed_drone', bed), ('sfx' + SUF, sfx)):
    pk = np.max(np.abs(buf)); buf = buf / pk * 0.5 if pk > 0.5 else buf
    sf.write(f'{HERE}/assets/{name}.wav', buf.astype(np.float32), SR, subtype='FLOAT')
    print(name, f'{TOTAL}s peak {20*np.log10(np.max(np.abs(buf))+1e-9):.1f} dBFS')

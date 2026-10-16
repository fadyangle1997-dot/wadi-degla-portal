#!/usr/bin/env python3
"""Cinematic score for Episode 2 (original synthesis, copyright-safe). Replaces the drone bed from sound.py.

Instruments: string ensemble (detuned saws, low-passed, optional tremolo), 'ah' choir (formant-filtered saws),
piano (inharmonic partials), taiko / toms / snare, cymbal swells, sub booms; one convolution-reverb bus.
Harmony follows DS §7: D minor through the struggle, D major on the Ballon d'Or, the goal and the title;
silence before every impact (1989, «لأ», the freeze before «مقصية»).
Output: assets/bed.wav (48 kHz stereo float); with EP2_NO_MONTAGE=1, assets/bed_nomontage.wav (no montage drum burst).
"""
import json, os, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE)
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
SR = 48000; BODY_END = round(L[-1]['end'] + 0.4, 2); TOTAL = round(BODY_END + 4.6, 2); N = int(TOTAL * SR)
ls = lambda i: L[i]['start']; le = lambda i: L[i]['end']
rng = np.random.default_rng(2001)
NO_MONT = os.environ.get('EP2_NO_MONTAGE') == '1'
dry = np.zeros((N, 2)); wet_in = np.zeros((N, 2)); drums = np.zeros((N, 2))

NAMES = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'Bb': 10, 'B': 11}
def hz(n): return 440.0 * 2 ** ((NAMES[n[:-1]] + 12 * (int(n[-1]) + 1) - 69) / 12)
def lp(x, fc, o=2): return sosfilt(butter(o, fc, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, 'high', fs=SR, output='sos'), x, axis=0)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)
def env(n, a, r):
    e = np.ones(n); a = min(int(a * SR), n // 2); r = min(int(r * SR), n // 2)
    if a: e[:a] = np.linspace(0, 1, a) ** 1.6
    if r: e[-r:] *= np.linspace(1, 0, r) ** 1.6
    return e
def put(buf, t, sig, db=0.0, pan=0.0):
    i = int(t * SR)
    if i >= N or i < 0: return
    if sig.ndim == 1: sig = np.stack([sig * min(1, 1 - pan), sig * min(1, 1 + pan)], 1)
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i] * 10 ** (db / 20)

def saw_voice(f, n, vib=0.0025, rate=5.2, ph=0.0):
    t = np.arange(n) / SR
    inst = f * (1 + vib * np.sin(2 * np.pi * rate * t + ph * 7))
    phase = (np.cumsum(inst) / SR + ph) % 1.0
    return 2 * phase - 1

def strings(t0, t1, notes, db, a=1.4, r=1.8, cut=1700, trem=False, send=0.6):
    n = int((t1 - t0) * SR); out = np.zeros((n, 2))
    for k, nt in enumerate(notes):
        f = hz(nt)
        for v, c in enumerate((-13, -6, 0, 6, 13)):
            s = saw_voice(f * 2 ** (c / 1200), n, ph=rng.uniform(0, 1))
            pan = (v - 2) / 3.0
            out[:, 0] += s * (1 - max(0, pan)); out[:, 1] += s * (1 + min(0, pan))
    out = lp(out, cut) / (len(notes) * 4)
    if trem: out *= (0.72 + 0.28 * np.sin(2 * np.pi * 7.5 * np.arange(n) / SR))[:, None]
    out *= env(n, a, r)[:, None]
    put(dry, t0, out, db); put(wet_in, t0, out, db + 20 * np.log10(send + 1e-6))

def choir(t0, t1, notes, db, a=1.8, r=2.5):
    n = int((t1 - t0) * SR); mono = np.zeros(n)
    for nt in notes:
        for c in (-8, 0, 8): mono += saw_voice(hz(nt) * 2 ** (c / 1200), n, vib=0.004, rate=4.6, ph=rng.uniform(0, 1))
    s = bp(mono, 600, 820) + 0.55 * bp(mono, 1080, 1320) + 0.22 * bp(mono, 2400, 2800)
    s = s / (len(notes) * 2) * env(n, a, r)
    st = np.stack([s, np.roll(s, 240)], 1)
    put(dry, t0, st, db - 4); put(wet_in, t0, st, db)

def piano(t, nt, db, dur=3.0):
    f = hz(nt); n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n); B = 0.0004
    for k in range(1, 9):
        fk = k * f * np.sqrt(1 + B * k * k)
        if fk > 8000: break
        tau = 1.6 / k ** 0.7
        s += (1 / k ** 1.2) * np.exp(-tt / tau) * (np.sin(2 * np.pi * fk * tt) + 0.6 * np.sin(2 * np.pi * fk * 1.0007 * tt))
    s += lp(rng.standard_normal(n), 2500) * np.exp(-tt / 0.006) * 0.3
    s *= env(n, 0.003, 0.3) * 0.35
    put(dry, t, s, db, pan=0.15); put(wet_in, t, s, db - 2, pan=0.15)

def taiko(t, db, big=False):
    n = int((1.6 if big else 0.9) * SR); tt = np.arange(n) / SR
    f = 42 + (70 if big else 55) * np.exp(-tt / 0.05)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / (0.55 if big else 0.32))
    s += lp(rng.standard_normal(n), 400) * np.exp(-tt / 0.05) * 0.8 + 0.25 * np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.06)
    s = np.tanh(1.4 * s) * 0.9
    put(drums, t, s, db); put(wet_in, t, s, db - 10)

def tom(t, db, f0=110):
    n = int(0.5 * SR); tt = np.arange(n) / SR; f = f0 * (0.7 + 0.3 * np.exp(-tt / 0.08))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.18) + bp(rng.standard_normal(n), 200, 1200) * np.exp(-tt / 0.03) * 0.3
    put(drums, t, s * 0.7, db, pan=rng.uniform(-0.3, 0.3)); put(wet_in, t, s * 0.7, db - 12)

def snare(t, db):
    n = int(0.3 * SR); tt = np.arange(n) / SR
    s = bp(rng.standard_normal(n), 1200, 6000) * np.exp(-tt / 0.1) * 0.6 + np.sin(2 * np.pi * 190 * tt) * np.exp(-tt / 0.04) * 0.5
    put(drums, t, s, db); put(wet_in, t, s, db - 8)

def cymbal(t, db, dur=3.5, swell=False):
    n = int(dur * SR); tt = np.arange(n) / SR; x = hp(rng.standard_normal(n), 5500)
    e = (tt / dur) ** 3 if swell else np.exp(-tt / (dur / 4))
    s = x * e * 0.25
    st = np.stack([s, np.roll(s, 300)], 1)
    put(drums, t, st, db); put(wet_in, t, st, db - 4)

def boom(t, db):
    n = int(2.5 * SR); tt = np.arange(n) / SR; f = 30 + 25 * np.exp(-tt / 0.2)
    put(drums, t, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.9) * 0.9, db)

def pulse(t0, t1, bpm, roots, db, sub=2, beats_per_chord=8):
    b = 60.0 / bpm / sub; k = 0; t = t0
    while t < t1 - 0.05:
        f = roots[(k // (beats_per_chord * sub)) % len(roots)]
        n = int(0.35 * SR); tt = np.arange(n) / SR
        s = (np.sin(2 * np.pi * hz(f) * tt) + 0.4 * np.sin(4 * np.pi * hz(f) * tt)) * np.exp(-tt / 0.12)
        put(dry, t, np.tanh(1.3 * s) * 0.5, db + (0 if k % (2 * sub) == 0 else -5)); t += b; k += 1

# ======================================================================= arrangement
Dm = ['D3', 'A3', 'D4', 'F4']; Bb = ['Bb2', 'F3', 'Bb3', 'D4']; F = ['F2', 'C3', 'A3', 'F4']; C = ['C3', 'G3', 'C4', 'E4']
Gm = ['G2', 'D3', 'Bb3', 'G4']; A = ['A2', 'E3', 'A3', 'C#4']; DM = ['D3', 'A3', 'D4', 'F#4', 'A4']

# cold open (frame 0 already carries sound)
strings(0.0, 9.9, Dm, -20, a=0.15, r=1.4, cut=1400)
strings(0.0, 9.9, ['D2'], -18, a=0.1, r=1.4, cut=400, send=0.3)
piano(ls(1) + 0.1, 'D2', -10, 4.0)
strings(ls(2), 9.9, ['Eb4'], -30, a=1.0, r=1.0, cut=1600)                      # dissonant rub on «الدكة»
# rewind: thin high tremolo
strings(ls(4) - 0.2, ls(8) + 0.3, ['A4', 'D5'], -32, a=0.6, r=0.8, cut=3000, trem=True)

# Act I, the hunger: sad piano motif over a soft pad, 72 bpm (bar = 4 beats)
bar = 60 / 72 * 4; motif = [('D5', 0), ('F5', 1.5), ('E5', 2), ('D5', 2.5), ('C5', 4), ('A4', 5.5), ('Bb4', 8), ('A4', 9.5), ('G4', 10), ('A4', 12), ('D4', 13.5)]
t = ls(8); prog = [Dm, Bb, Gm, A]
k = 0
while t < ls(24) - 0.6:
    seg_end = min(t + bar, ls(24) - 0.6)
    strings(t, seg_end + 0.8, prog[k % 4], -33, a=1.2, r=1.2, cut=1300)
    k += 1; t += bar
for rep in range(3):
    base = ls(8) + 0.4 + rep * bar * 4
    for nt, beat in motif:
        tt = base + beat * 60 / 72
        if tt < ls(24) - 1.0: piano(tt, nt, -22)
# 1989: silence before the impact; then a hollow low string
strings(ls(26) + 0.5, ls(29) + 0.3, ['D2', 'A2'], -29, a=1.5, r=1.0, cut=600)
piano(ls(27) + 0.3, 'A3', -25); piano(ls(28) + 0.2, 'F3', -26)
# the mother: Bb major warmth
strings(ls(29) - 0.1, ls(33) - 0.2, Bb, -24, a=1.0, r=1.0, cut=1600)
for i, nt in enumerate(['F4', 'Bb4', 'D5', 'C5']): piano(ls(29) + i * 1.2, nt, -20)

# Acts II–III, the rise: pulse 108 bpm, rising progression, taiko from Barça on
rise = [Dm, Bb, F, C]; b108 = 60 / 108 * 4 * 2
t = ls(33) - 0.3; k = 0
while t < ls(52) - 0.5:
    strings(t, min(t + b108, ls(52) - 0.3) + 0.6, rise[k % 4], -21.5 if t < ls(46) else -19.5, a=0.6, r=0.6, cut=1800 if t < ls(46) else 2400)
    k += 1; t += b108
pulse(ls(33) - 0.3, ls(52) - 0.4, 108, ['D2', 'Bb1', 'F2', 'C2'], -16.5)
t = ls(42); beat = 60 / 108
while t < ls(52) - 0.6: taiko(t, -18.5); t += beat * 4
choir(ls(46) - 0.2, ls(52) - 0.2, ['F3', 'A3', 'C4'], -26.5)                     # Barça arrives

# Act IV, the Ballon d'Or: suspense pedal, heartbeat, silence, counters, D-major bloom
strings(ls(52) - 0.3, le(58) + 0.05, ['A2', 'E3', 'A3'], -23, a=0.8, r=0.3, cut=1500, trem=True)
t = ls(52)
while t < le(58) - 0.3: taiko(t, -24); taiko(t + 0.28, -30); t += 1.0
cymbal(le(58) - 2.2, -20, 2.2, swell=True)
strings(ls(59) - 0.05, ls(61) - 0.05, Dm, -21, a=0.1, r=0.2, cut=1800)
taiko(ls(59) + 1.25, -16); taiko(ls(60) + 1.55, -13, big=True)
strings(ls(61) - 0.05, ls(65) - 0.2, DM + ['D5'], -14, a=0.3, r=2.2, cut=2600)  # the bloom
choir(ls(61) + 0.1, ls(65) - 0.3, ['D4', 'F#4', 'A4'], -19, a=1.5, r=2.0)
cymbal(ls(61) - 0.05, -16, 4.0)
for i, nt in enumerate(['D4', 'F#4', 'A4', 'D5', 'F#5', 'A5']): piano(ls(61) + 0.4 + i * 0.32, nt, -16)

# «صح؟ … لأ.»: nothing (the SFX sub-hit carries «لأ»)
# Act V, the bench: cold low strings with a minor-second rub, sparse dissonant piano
strings(ls(68) - 0.3, ls(79) - 0.5, ['D2', 'A2', 'Eb3'], -24, a=1.5, r=1.0, cut=900, trem=True)
for i, nt in enumerate(['Eb4', 'D4', 'A3', 'Eb4', 'D4']): piano(ls(70) + i * 3.3, nt, -21)

# archive montage (answering «عامل إزاي»): a burst of drums, then air before «ليلة واحدة»
m0 = ls(79) - 0.2
if not NO_MONT:
    for i in range(8): taiko(m0 + i * 0.5, -17 + (2 if i % 2 == 0 else 0))
    cymbal(m0 + 3.0, -24, 1.4)
strings(m0, m0 + 3.6, Dm, -22 if not NO_MONT else -25, a=0.2 if not NO_MONT else 0.8, r=0.6, cut=2200)

# Act VI, one night: ostinato + taiko groove building with every goal
strings(ls(81) - 0.2, ls(102), ['D2', 'D3', 'A3', 'D4'], -24, a=1.0, r=0.4, cut=1600)
pulse(ls(81), ls(102), 116, ['D2', 'Bb1', 'F2', 'A1'], -17)
b = 60 / 116; t = ls(81); k = 0
while t < ls(102):
    lvl = -21 if t < ls(96) else (-18 if t < ls(98) else -15)
    taiko(t, lvl); taiko(t + 1.5 * b, lvl - 5)
    if t >= ls(98): tom(t + 2.5 * b, lvl - 2, 140); tom(t + 3 * b, lvl - 2, 120); tom(t + 3.5 * b, lvl - 2, 100)
    t += 4 * b; k += 1
strings(ls(96), ls(102), ['F4', 'A4'], -26, a=0.5, r=0.4, cut=2400, trem=True)
# 87': accelerating roll + riser into the freeze, then absolute silence until «مقصية»
t0r, t1r = ls(102), le(106) - 0.02; t = t0r; step = 0.25
while t < t1r: snare(t, -26 + 14 * (t - t0r) / (t1r - t0r)); t += step; step = max(0.06, step * 0.93)
cymbal(t1r - 3.0, -16, 3.0, swell=True)
strings(t0r, t1r, ['A3', 'D4', 'E4', 'A4'], -22, a=2.5, r=0.05, cut=2600, trem=True)
# GOAL: everything at once, D major
G = ls(108)
taiko(G, -8, big=True); boom(G, -10); cymbal(G, -12, 5.0)
strings(G, ls(116) - 0.3, DM + ['D5', 'F#5'], -13, a=0.05, r=3.0, cut=3200)
choir(G + 0.05, ls(116) - 0.3, ['D4', 'F#4', 'A4', 'D5'], -17, a=0.6, r=3.0)
strings(G, ls(112), ['D1', 'D2'], -16, a=0.05, r=2.0, cut=300, send=0.2)
t = ls(109)
while t < ls(112): taiko(t, -16); taiko(t + 0.5, -20); t += 1.03

# Act VII, Yokohama: triumphant but restrained
strings(ls(116) - 0.3, ls(122), ['D3', 'A3', 'D4', 'F#4', 'B4'], -19, a=1.0, r=1.2, cut=2400)
choir(ls(118), ls(122) - 0.2, ['F#4', 'A4', 'D5'], -24)
t = ls(116)
while t < ls(122) - 0.5: taiko(t, -21); t += 2.07
for i, nt in enumerate(['A4', 'D5', 'F#5', 'E5', 'D5']): piano(ls(120) + i * 0.45, nt, -18)

# Van Gaal returns: back to minor
strings(ls(122) - 0.2, ls(125), ['D2', 'A2', 'F3'], -25, a=0.8, r=0.8, cut=900)
piano(ls(124), 'D3', -18, 4)

# recap: one chord per clause, rising, taiko on each line; peak on the World Cup
recap = [(125, Bb), (126, F), (127, C), (128, Gm), (129, A)]
for li, ch in recap:
    t1x = ls(li + 1) if li + 1 <= 130 else ls(130)
    strings(ls(li) - 0.1, t1x + 0.4, ch, -18.5 + (li - 125), a=0.5, r=0.6, cut=2000 + 200 * (li - 125))
    taiko(ls(li), -17.5 + (li - 125))
choir(ls(127), ls(130), ['D4', 'A4'], -22.5)
cymbal(ls(130) - 1.6, -20, 1.6, swell=True)
# title «ريفالدو»: the final D major, then the tease and the end card
T = ls(131)
taiko(T, -11, big=True); boom(T, -14); cymbal(T, -16, 4.0)
strings(T - 0.03, TOTAL - 0.2, DM + ['E5'], -15, a=0.1, r=4.0, cut=2800)
choir(T + 0.05, TOTAL - 0.4, ['D4', 'F#4', 'A4'], -20, a=1.0, r=3.5)
for i, nt in enumerate(['D5', 'E5', 'F#5', 'A5', 'B5', 'A5']): piano(ls(135) + i * 0.38, nt, -20)   # playful tease
taiko(BODY_END + 0.3, -14, big=True)

# ======================================================================= reverb bus + write
tt = np.arange(int(2.4 * SR)) / SR
ir = rng.standard_normal((len(tt), 2)) * np.exp(-tt / (2.2 / 6.9))[:, None]
ir = lp(ir, 6000); ir[: int(0.025 * SR)] = 0; ir /= np.sqrt(np.sum(ir ** 2))
wet = np.stack([fftconvolve(wet_in[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = dry + 0.55 * wet + drums
mix = hp(mix, 30)
# DS §7 silences before impacts, reverb tails included: 1989 · «صح؟ … لأ.» · the freeze before «مقصية»
for a, b, fade in ((ls(24) + 0.05, ls(26) + 0.5, 0.35), (ls(66) - 0.3, ls(68) - 0.35, 0.5), (le(106), ls(108) - 0.005, 0.03)):
    g = np.ones(N); ia, ib, nf = int(a * SR), int(b * SR), int(fade * SR)
    g[ia:ib] = 0; g[max(0, ia - nf):ia] = np.linspace(1, 0, min(nf, ia))
    mix *= g[:, None]
fo = int(1.0 * SR); mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
mix = mix / np.max(np.abs(mix)) * 0.5
sf.write(f'{HERE}/assets/bed{"_nomontage" if NO_MONT else ""}.wav', mix.astype(np.float32), SR, subtype='FLOAT')
print('score written', TOTAL, 's')

#!/usr/bin/env python3
"""Episode 2 mix: narrator tone chain + ducked score + SFX → assets/mix.wav (−14 LUFS integrated, ≤ −2.5 dBTP).

VO chain (timing untouched, so subtitles stay locked): high-pass, chest +, box −, presence +, air +, de-esser,
2.5:1 compressor (ffmpeg); then parallel tanh saturation, a faint small-room ambience, per-line emphasis rides and
hall-reverb throws on the climactic single words (python).
Score ducking: a 3-band split; the VO envelope pulls the whole bed down a little and the 300 Hz–4 kHz band (where the
voice lives) further, with 30 ms look-ahead, and less on the climaxes so they still bloom.
usage: mix.py            → assets/mix.wav            (bed.wav + sfx.wav)
       EP2_NO_MONTAGE=1  → assets/mix_nomontage.wav  (bed_nomontage.wav + sfx_nomontage.wav)
"""
import json, os, subprocess, tempfile, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, lfilter, fftconvolve

HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE); A = f'{HERE}/assets'
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
ls = lambda i: L[i]['start']; le = lambda i: L[i]['end']
SUF = '_nomontage' if os.environ.get('EP2_NO_MONTAGE') == '1' else ''
SR = 48000; rng = np.random.default_rng(10)
BED_UNDER_VO = 16.0          # dB the ducked score sits under the voice while it speaks (the v2 drone bed sat ~24 dB under)
VO_SPEECH_LUFS = -15.7       # pre-master VO level over speech, as in the v2 mix, so the SFX keep their balance
TP_TARGET = -2.5

def lp(x, fc, o=2): return sosfilt(butter(o, fc, 'low', fs=SR, output='sos'), x, axis=0)
def hp(x, fc, o=2): return sosfilt(butter(o, fc, 'high', fs=SR, output='sos'), x, axis=0)
def kweight(x):
    x = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1, -1.69065929318241, 0.73248077421585], x, axis=0)
    return lfilter([1.0, -2.0, 1.0], [1, -1.99004745483398, 0.99007225036621], x, axis=0)
def lufs(x, mask=None):
    y = kweight(x if x.ndim == 2 else x[:, None]); ms = (y ** 2).sum(1)
    return -0.691 + 10 * np.log10(np.mean(ms if mask is None else ms[mask]) + 1e-20)
def ramp_mask(windows, n, fade=0.04):
    """1 inside windows, 0 outside, with short linear fades (sample-accurate)."""
    g = np.zeros(n); nf = int(fade * SR)
    for a, b in windows:
        ia, ib = max(0, int(a * SR)), min(n, int(b * SR)); g[ia:ib] = 1
        g[max(0, ia - nf):ia] = np.maximum(g[max(0, ia - nf):ia], np.linspace(0, 1, ia - max(0, ia - nf)))
        g[ib:min(n, ib + nf)] = np.maximum(g[ib:min(n, ib + nf)], np.linspace(1, 0, min(n, ib + nf) - ib))
    return g
def room_ir(rt60, pre, n_er, er_span, lo, hi):
    n = int((rt60 * 1.2 + pre) * SR); t = np.arange(n) / SR; ir = np.zeros((n, 2))
    for k in range(n_er):                                       # early reflections, alternating sides
        d = pre + er_span * (k + 1) / n_er * rng.uniform(0.85, 1.15); g = 0.7 ** (k + 1)
        ir[int(d * SR), k % 2] += g; ir[int((d + 0.0017) * SR), (k + 1) % 2] += g * 0.6
    tail = rng.standard_normal((n, 2)) * np.exp(-np.maximum(0, t - pre) / (rt60 / 6.91))[:, None]
    tail[: int((pre + er_span * 0.5) * SR)] = 0
    ir += 0.35 * tail; ir = hp(lp(ir, hi), lo)
    return ir / np.sqrt((ir ** 2).sum() / 2)
def conv(x, ir, n): return np.stack([fftconvolve(x, ir[:, c])[:n] for c in range(2)], 1)

# ---------------------------------------------------------------- 1 · VO tone chain (ffmpeg part)
CHAIN = ('highpass=f=70:poles=2,'
         'equalizer=f=165:t=q:w=0.9:g=1.5,'          # chest
         'equalizer=f=380:t=q:w=1.3:g=-2.5,'         # boxiness
         'equalizer=f=3200:t=q:w=1.1:g=2.2,'         # presence / articulation
         'highshelf=f=10500:g=1.5,'                  # air
         'deesser=i=0.45:m=0.5:f=0.5:s=o,'
         'acompressor=threshold=0.063:ratio=2.5:attack=8:release=140:knee=4:makeup=1.6')
tmp = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', f'{A}/vo_edit.wav', '-af', f'aresample={SR},{CHAIN}',
                '-ac', '1', '-c:a', 'pcm_f32le', tmp], check=True)
vo, _ = sf.read(tmp); os.unlink(tmp)

bed, _ = sf.read(f'{A}/bed{SUF}.wav'); sfx, _ = sf.read(f'{A}/sfx{SUF}.wav')
N = len(bed); assert len(sfx) == N
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]

# ---------------------------------------------------------------- 2 · VO colour, space, emphasis
vo = vo + 0.25 * (np.tanh(2.5 * vo) / 2.5 - vo)                              # parallel soft saturation (density)
RIDES = {24: -0.8, 25: -0.8, 26: -1.2, 27: -1.0, 28: -1.0,                    # 1989 · the father: closer, quieter
         61: 1.5, 67: 2.5, 101: 1.0, 107: 2.0, 108: 3.0, 112: 1.0, 131: 2.0, 137: 1.0}
ride_db = np.zeros(N)
for i, db in RIDES.items(): ride_db += db * ramp_mask([(ls(i) - 0.05, le(i) + 0.12)], N, 0.04)
vo = vo * 10 ** (ride_db / 20)
room = room_ir(0.38, 0.004, 6, 0.028, 220, 5500)
throws = ramp_mask([(ls(108), le(108)), (ls(131), le(131)), (ls(137), le(137))], N, 0.02)
hall = room_ir(2.3, 0.045, 8, 0.07, 320, 6000)
vo_st = np.stack([vo, vo], 1) + 10 ** (-19 / 20) * conv(vo, room, N) + 10 ** (-9 / 20) * conv(vo * throws, hall, N)

# ---------------------------------------------------------------- 3 · score ducking (3-band, look-ahead)
fr = int(0.010 * SR); look = int(0.030 * SR)
e = np.sqrt(lp(vo ** 2, 25, 1).clip(0) + 1e-12); e_db = 20 * np.log10(e)
gr = np.clip(e_db - (-30.0), 0, None)                                       # dB above the duck threshold
gr = np.concatenate([gr[look:], np.zeros(look)])                            # look-ahead
sm = np.zeros(N); a_c, r_c = np.exp(-1 / (0.025 * SR)), np.exp(-1 / (0.45 * SR)); acc = 0.0
for k in range(0, N, fr):                                                   # attack / release smoothing at 100 Hz
    tgt = gr[k:k + fr].max(); c = a_c ** fr if tgt > acc else r_c ** fr
    acc = tgt + (acc - tgt) * c; sm[k:k + fr] = acc
climax = ramp_mask([(ls(61), le(61) + 0.3), (ls(108), le(109)), (ls(131), le(131) + 0.4)], N, 0.3)
scale = 1 - 0.6 * climax
broad_db = -np.minimum(sm * 0.35, 5.0) * scale
mid_db = -np.minimum(sm * 0.30, 5.0) * scale
lo_b, hi_b = lp(bed, 300, 4), hp(bed, 4000, 4); mid_b = bed - lo_b - hi_b
bed_d = (lo_b + hi_b) * 10 ** (broad_db / 20)[:, None] + mid_b * 10 ** ((broad_db + mid_db) / 20)[:, None]

# ---------------------------------------------------------------- 4 · balance + master
speech = ramp_mask([(l['start'], l['end']) for l in L], N, 0.0) > 0.5
vo_st *= 10 ** ((VO_SPEECH_LUFS - lufs(vo_st, speech)) / 20)
bed_gain = (VO_SPEECH_LUFS - BED_UNDER_VO) - lufs(bed_d, speech)
mix = vo_st + bed_d * 10 ** (bed_gain / 20) + sfx
pre = tempfile.NamedTemporaryFile(suffix='.wav', delete=False).name
sf.write(pre, mix.astype(np.float32), SR, subtype='FLOAT')
out = f'{A}/mix{SUF}.wav'

def ebur(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr.split('Summary:')[-1]
    I = float(r.split('I:')[1].split('LUFS')[0]); LRA = float(r.split('LRA:')[1].split('LU')[0])
    TP = float(r.split('Peak:')[1].split('dBFS')[0]); return I, LRA, TP
I0, _, _ = ebur(pre); g = -14.0 - I0; lim = TP_TARGET - 0.9
for it in range(3):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', pre, '-af',
                    f'volume={g:.3f}dB,alimiter=limit={10 ** (lim / 20):.4f}:attack=2:release=80:level=disabled:asc=1,aresample={SR}',
                    '-ac', '2', '-c:a', 'pcm_s24le', out], check=True)
    I, LRA, TP = ebur(out)
    if abs(I + 14.0) <= 0.1 and TP <= TP_TARGET: break
    g += -14.0 - I
    if TP > TP_TARGET: lim -= (TP - TP_TARGET) + 0.1
os.unlink(pre)
print(f'{os.path.basename(out)}: I {I} LUFS · LRA {LRA} LU · TP {TP} dBTP · score under VO {BED_UNDER_VO} dB '
      f'(bed gain {bed_gain:+.1f} dB) · duck up to {5.0 + 5.0:.0f} dB in the voice band')

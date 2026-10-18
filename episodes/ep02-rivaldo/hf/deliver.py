#!/usr/bin/env python3
"""Final deliverables for Episode 2.

  1. rivaldo_final.mp4  the v4 render (archive footage inserts) remuxed with the current mix (assets/mix.wav), so a
                        mix change never needs a new picture render
  2. send copy under 30 MB: HEVC 2-pass (hvc1) + AAC 128k, and the ~3-minute highlight cut
  (v3 only: `masters-nomontage` swaps the montage frames for the v2 frames by diffing the two renders.)
usage: deliver.py [step ...]   steps: masters, send, highlight (default: all), masters-nomontage
"""
import json, os, subprocess, sys, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); EP = os.path.dirname(HERE)
R, D = f'{HERE}/renders', f'{EP}/deliver'
V4, V3, V2 = f'{R}/rivaldo_v4_footage.mp4', f'{R}/rivaldo_v3_montage.mp4', f'{R}/rivaldo_v2.mp4'
FINAL, FINAL_NM = f'{R}/rivaldo_final.mp4', f'{R}/rivaldo_final_nomontage.mp4'
HL = f'{R}/rivaldo_final_highlight.mp4'
L = json.load(open(f'{EP}/audio/line_timings_edit.json', encoding='utf-8'))['lines']
FPS = 30; W, H = 54, 68
STEPS = sys.argv[1:] or ['masters', 'send', 'highlight']
COLOR = ['-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']

def run(cmd): print('$', ' '.join(cmd)[:220]); subprocess.run(cmd, check=True)
def frames(path):
    p = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-vf', f'scale={W}:{H}:flags=area,format=gray',
                        '-f', 'rawvideo', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(p, np.uint8).reshape(-1, H, W).astype(np.int16)

def swap_window():
    a, b = frames(V3), frames(V2); n = min(len(a), len(b))
    d = np.abs(a[:n] - b[:n]).mean((1, 2)); diff = np.where(d > 1.5)[0]
    m0 = int((L[79]['start'] - 0.2) * FPS); m1 = m0 + int(4.6 * FPS)
    runs, s = [], None                                   # contiguous runs of differing frames
    for k in range(n + 1):
        on = k < n and d[k] > 1.5
        if on and s is None: s = k
        if not on and s is not None: runs.append((s, k)); s = None
    print('differing runs (frames):', [(x, y, round(x / FPS, 2), round(y / FPS, 2)) for x, y in runs])
    mont = [r for r in runs if r[0] < m1 + 6 and r[1] > m0 - 6]
    assert mont, 'montage window not found in the diff'
    lo, hi = max(0, min(r[0] for r in mont) - 2), min(n, max(r[1] for r in mont) + 2)
    print(f'swap v2 frames {lo}–{hi} ({lo / FPS:.2f}–{hi / FPS:.2f} s); expected montage {m0}–{m1}')
    return lo, hi

if 'masters' in STEPS:
    run(['ffmpeg', '-loglevel', 'error', '-y', '-i', V4, '-i', f'{HERE}/assets/mix.wav', '-map', '0:v', '-map', '1:a',
         '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', FINAL])
if 'masters-nomontage' in STEPS:
    lo, hi = swap_window()
    fc = (f'[0:v]trim=start_frame=0:end_frame={lo},setpts=PTS-STARTPTS[a];'
          f'[1:v]trim=start_frame={lo}:end_frame={hi},setpts=PTS-STARTPTS[b];'
          f'[0:v]trim=start_frame={hi},setpts=PTS-STARTPTS[c];[a][b][c]concat=n=3:v=1:a=0[v]')
    run(['nice', 'ffmpeg', '-loglevel', 'error', '-y', '-i', V3, '-i', V2, '-i', f'{HERE}/assets/mix_nomontage.wav',
         '-filter_complex', fc, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-crf', '15', '-preset', 'medium',
         '-pix_fmt', 'yuv420p', *COLOR, '-r', str(FPS), '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', FINAL_NM])

def hevc(src, out, kbps, tag):
    stats = f'{R}/x265_{tag}.log'
    base = ['-c:v', 'libx265', '-b:v', f'{kbps}k', '-preset', 'medium', '-tag:v', 'hvc1', '-pix_fmt', 'yuv420p']
    run(['nice', 'ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-map', '0:v', *base,
         '-x265-params', f'pass=1:stats={stats}:log-level=error', '-an', '-f', 'null', '/dev/null'])
    run(['nice', 'ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-map', '0:v', '-map', '0:a', *base,
         '-x265-params', f'pass=2:stats={stats}:log-level=error', *COLOR,
         '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', out])
    for f in (stats, stats + '.cutree'):
        if os.path.exists(f): os.unlink(f)
    print(out, round(os.path.getsize(out) / 1e6, 2), 'MB')

if 'send' in STEPS:
    os.makedirs(D, exist_ok=True)
    hevc(FINAL, f'{D}/Rivaldo_Ep2_FULL.mp4', 600, 'full')
    if os.path.exists(FINAL_NM) and 'masters-nomontage' in STEPS: hevc(FINAL_NM, f'{D}/Rivaldo_Ep2_FULL_no-archive-footage.mp4', 600, 'nm')

if 'highlight' in STEPS:
    run(['python3', '-I', f'{HERE}/cut_highlight.py', FINAL, HL])
    hevc(HL, f'{D}/Rivaldo_Ep2_sample_highlights_3min.mp4', 1150, 'hl')

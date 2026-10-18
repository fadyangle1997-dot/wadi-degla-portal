#!/usr/bin/env python3
"""Cut the ~3-minute highlight sample from the full render.

Joins sit at the midpoint of a VO pause, with a dip to black (DS §6: motivated transition for a time jump)
and a matching equal-power audio crossfade of the same length, so picture and sound stay in sync.
usage: cut_highlight.py full.mp4 out.mp4
"""
import json, os, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
L = json.load(open(f'{HERE}/../audio/line_timings_edit.json', encoding='utf-8'))['lines']
src, out = sys.argv[1], sys.argv[2]
dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout)
mid = lambda a: (L[a]['end'] + L[a + 1]['start']) / 2      # pause after line a
X = 0.4
segs = [(0.0, mid(3)), (mid(53), mid(121)), (mid(129), dur)]  # hook · Ballon d'Or → World Cup · title → end card
for a, b in zip(segs, segs[1:]):
    assert b[0] - a[1] > 0
print('segments', [(round(a, 2), round(b, 2)) for a, b in segs])
inputs, fc = [], []
for k, (s0, s1) in enumerate(segs):            # one input per segment (input seeking): no frame buffering
    inputs += ['-ss', f'{s0:.3f}', '-to', f'{s1:.3f}', '-i', src]
    fc.append(f'[{k}:v]setpts=PTS-STARTPTS[v{k}]'); fc.append(f'[{k}:a]asetpts=PTS-STARTPTS[a{k}]')
cur_v, cur_a, t = 'v0', 'a0', segs[0][1] - segs[0][0]
for k in range(1, len(segs)):
    fc.append(f'[{cur_v}][v{k}]xfade=transition=fadeblack:duration={X}:offset={t - X:.3f}[vx{k}]')
    fc.append(f'[{cur_a}][a{k}]acrossfade=d={X}:c1=qsin:c2=qsin[ax{k}]')
    cur_v, cur_a = f'vx{k}', f'ax{k}'
    t = t - X + (segs[k][1] - segs[k][0])
fc.append(f'[{cur_a}]alimiter=limit=0.70:attack=2:release=60:level=disabled[alim]'); cur_a = 'alim'   # the crossfades can sum over the master's peak
subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *inputs, '-filter_complex', ';'.join(fc), '-map', f'[{cur_v}]', '-map', f'[{cur_a}]',
                '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
                '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
print('wrote', out, round(t, 2), 's')

#!/usr/bin/env python3
"""Open VO-free 'sound-up' gaps for the footage showcases (run once; refuses to run twice).

Each gap is opened at the middle of the pause after a line: the VO WAVs get silence there, every later line in
line_timings_edit.json moves by the gap, and the English SRT moves with it. Re-run subs_build.py afterwards to
rebuild the Arabic SRT and subs_edit.json from the shifted timings.
"""
import json, os, re, shutil, numpy as np, soundfile as sf

EP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAPS = [(48, 5.0),   # «…بدأت أهم مرحلة في حكايته.» → Barça skills showcase
        (79, 3.0)]   # «…كان لاعب عامل إزاي…» → archive montage
J = f'{EP}/audio/line_timings_edit.json'
D = json.load(open(J, encoding='utf-8')); L = D['lines']
assert 'showcase_gaps' not in D, 'gaps already applied'
cuts = sorted(((L[a]['end'] + L[a + 1]['start']) / 2, s, a) for a, s in GAPS)

def shift(t):
    return t + sum(s for c, s, _ in cuts if t > c)

for l in L: l['start'], l['end'] = round(shift(l['start']), 3), round(shift(l['end']), 3)
D['showcase_gaps'] = [{'after_line': a, 'edit_time': round(c, 3), 'seconds': s} for c, s, a in cuts]
json.dump(D, open(J, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

for wav in (f'{EP}/audio/vo_edit.wav', f'{EP}/hf/assets/vo_edit.wav'):
    if not os.path.exists(wav): continue
    shutil.copy(wav, wav.replace('.wav', '_pregaps.wav'))
    x, sr = sf.read(wav, always_2d=True); parts, prev = [], 0
    for c, s, _ in cuts:
        i = int(round(c * sr)); parts += [x[prev:i], np.zeros((int(round(s * sr)), x.shape[1]))]; prev = i
    parts.append(x[prev:]); sf.write(wav, np.concatenate(parts), sr, subtype='PCM_24')

def fmt(t):
    ms = int(round(t * 1000)); h, ms = divmod(ms, 3600000); m, ms = divmod(ms, 60000); s, ms = divmod(ms, 1000)
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'
def parse(ts):
    h, m, r = ts.split(':'); s, ms = r.split(','); return int(h) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000
srt = f'{EP}/audio/rivaldo_ep2.en.srt'
txt = open(srt, encoding='utf-8').read()
txt = re.sub(r'(\d\d:\d\d:\d\d,\d\d\d) --> (\d\d:\d\d:\d\d,\d\d\d)',
             lambda m: f'{fmt(shift(parse(m.group(1))))} --> {fmt(shift(parse(m.group(2))))}', txt)
open(srt, 'w', encoding='utf-8').write(txt)
print('gaps', [(round(c, 2), s) for c, s, _ in cuts], '→ new VO end', L[-1]['end'])

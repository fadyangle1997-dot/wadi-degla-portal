#!/usr/bin/env python3
"""Darkroom reveal (DS §5.5): the print develops from black, highlights first.

m = smoothstep(k - .35, k, luminance) in linear light, k: 1.05 → -0.12 over `dur` seconds;
bare paper carries a faint warm developer tint. Output: an MP4 clip the composition plays at the reveal.
usage: darkroom.py input.jpg output.mp4 [dur=2.0] [hold=4.0]
"""
import sys, subprocess, numpy as np
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
dur = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
hold = float(sys.argv[4]) if len(sys.argv) > 4 else 4.0
W, H, FPS = 1080, 1350, 30

im = Image.open(src).convert('RGB')
s = max(W / im.width, H / im.height)            # cover-fit to 4:5, centre crop
im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
l, t = (im.width - W) // 2, (im.height - H) // 2
srgb = np.asarray(im.crop((l, t, l + W, t + H)), dtype=np.float32) / 255.0
lin = np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)
lum = lin @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
paper = np.array([0.020, 0.016, 0.010], dtype=np.float32)   # warm developer tint (linear)

def smooth(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1); return x * x * (3 - 2 * x)

def to_srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)

ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out],
                      stdin=subprocess.PIPE)
n = int((dur + hold) * FPS)
for f in range(n):
    p = min(1.0, f / (dur * FPS))
    k = 1.05 + (-0.12 - 1.05) * (p * p * (3 - 2 * p))          # eased level
    m = smooth(k - 0.35, k, lum)[..., None]
    frame = paper * (1 - m) + lin * m
    ff.stdin.write((to_srgb(frame) * 255 + 0.5).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
print('wrote', out, n, 'frames')

#!/usr/bin/env python3
"""Darkroom reveal (DS §5.5): the print develops from black, highlights first.

m = smoothstep(k - .35, k, luminance) in linear light, k: 1.05 → -0.12 over `dev` seconds; bare paper carries
a faint warm developer tint. The act grade (saturate/sepia, soft-light colour, vignette) and one continuous
pull-back (zoom 1.12 → 1.0) are baked in, so the clip matches the graded stills around it (DS §6: the climax is
the slowest move in the film).
usage: darkroom.py input.jpg output.mp4 total_seconds [dev=2.0] [pos_x=0.5 pos_y=0.25] [sat=0.85 sep=0.14]
"""
import sys, subprocess, numpy as np
from PIL import Image

src, out, total = sys.argv[1], sys.argv[2], float(sys.argv[3])
dev = float(sys.argv[4]) if len(sys.argv) > 4 else 2.0
px, py = (float(sys.argv[5]), float(sys.argv[6])) if len(sys.argv) > 6 else (0.5, 0.25)
sat, sep = (float(sys.argv[7]), float(sys.argv[8])) if len(sys.argv) > 8 else (0.85, 0.14)
W, H, FPS, Z0 = 1080, 1350, 30, 1.12
GRADE, GALPHA = np.array([0xC8, 0xA8, 0x6E]) / 255.0, 0.11      # gold500 soft-light (act IV)

im = Image.open(src).convert('RGB')
cover = max(W / im.width, H / im.height) * Z0                    # oversample for the pull-back
big = im.resize((round(im.width * cover), round(im.height * cover)), Image.LANCZOS)
BW, BH = big.size
base = np.asarray(big, dtype=np.float32) / 255.0

# CSS filter maths (sRGB), applied once to the oversampled plate
def saturate(x, s):
    m = np.array([[.213 + .787 * s, .715 - .715 * s, .072 - .072 * s],
                  [.213 - .213 * s, .715 + .285 * s, .072 - .072 * s],
                  [.213 - .213 * s, .715 - .715 * s, .072 + .928 * s]])
    return np.clip(x @ m.T, 0, 1)
def sepia(x, a):
    m = np.array([[.393 + .607 * (1 - a), .769 - .769 * (1 - a), .189 - .189 * (1 - a)],
                  [.349 - .349 * (1 - a), .686 + .314 * (1 - a), .168 - .168 * (1 - a)],
                  [.272 - .272 * (1 - a), .534 - .534 * (1 - a), .131 + .869 * (1 - a)]])
    return np.clip(x @ m.T, 0, 1)
def softlight(b, s):
    d = np.where(b <= .25, ((16 * b - 12) * b + 4) * b, np.sqrt(b))
    return np.where(s <= .5, b - (1 - 2 * s) * b * (1 - b), b + (2 * s - 1) * (d - b))
g = sepia(saturate(base, sat), sep) * 1.0
g = np.clip((g - .5) * 1.04 + .5, 0, 1)                           # contrast(1.04)
g = g * (1 - GALPHA) + softlight(g, GRADE) * GALPHA

yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)                    # vignette (as ep2.css .vig)
cx, cy = W * .5, H * .45
d = np.sqrt(((xx - cx) / (np.sqrt(2) * max(cx, W - cx))) ** 2 + ((yy - cy) / (np.sqrt(2) * max(cy, H - cy))) ** 2)
vig = (1 - np.clip((d - .42) / .58, 0, 1) * .78)[..., None]

def lin(x): return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)
def srgb(x):
    x = np.clip(x, 0, 1); return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)
paper = np.array([0.020, 0.016, 0.010], dtype=np.float32)
def smooth(e0, e1, x):
    x = np.clip((x - e0) / (e1 - e0), 0, 1); return x * x * (3 - 2 * x)

ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                       '-c:v', 'libx264', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', out],
                      stdin=subprocess.PIPE)
n = int(round(total * FPS))
for f in range(n):
    u = f / max(1, n - 1); e = u * u * (3 - 2 * u)               # one continuous ease-in-out pull-back
    z = Z0 + (1.0 - Z0) * e
    cw, ch = W / (cover / (cover / Z0 * z)) , None
    sw, shh = int(round(W * Z0 / z)), int(round(H * Z0 / z))      # crop size in oversampled px
    sw, shh = min(sw, BW), min(shh, BH)
    x0 = int(round((BW - sw) * px)); y0 = int(round((BH - shh) * py))
    crop = Image.fromarray((g[y0:y0 + shh, x0:x0 + sw] * 255 + .5).astype(np.uint8)).resize((W, H), Image.BILINEAR)
    plate = lin(np.asarray(crop, dtype=np.float32) / 255.0)
    p = min(1.0, f / (dev * FPS)); k = 1.05 + (-0.12 - 1.05) * (p * p * (3 - 2 * p))
    lum = plate @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    m = smooth(k - 0.35, k, lum)[..., None]
    frame = srgb(paper * (1 - m) + plate * m) * vig
    ff.stdin.write((frame * 255 + 0.5).astype(np.uint8).tobytes())
ff.stdin.close(); ff.wait()
print('wrote', out, n, 'frames')

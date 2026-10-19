/**
 * BrandLogo — the ONE place the logo asset is referenced. Swapping in an SVG
 * later means changing only this file; no layout anywhere else moves.
 *
 * ── SIZES ────────────────────────────────────────────────────────────────
 * The mark renders at 28–104px. Three WebP files (128, 256, 512 px wide) cover
 * every placement up to 4× density, and the browser picks by `sizes`. The
 * common case is 6–13KB; the old PNG pair was 51KB + 157KB, and its srcset
 * declared each file at twice its real width, so dense screens got a blurry
 * mark.
 *
 * ── WHY THE ASSET WAS RE-PROCESSED ───────────────────────────────────────
 * The original stores transparency in a palette, and its transparent pixels
 * carry a grey-blue RGB value. Alpha 0 hides that colour — right up until the
 * browser downscales, at which point bilinear filtering averages the grey INTO
 * the logo's edge and produces a halo on the dark background. The edge colour
 * was bled outward so every pixel a filter can reach is already correct, and
 * 272px of dead margin was cropped so the mark fills its box and centres true.
 */
import React from 'react';
import logo128 from '../assets/wadi-degla-logo-128.webp';
import logo256 from '../assets/wadi-degla-logo-256.webp';
import logo512 from '../assets/wadi-degla-logo-512.webp';

export const BrandLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <img
    src={logo256}
    srcSet={`${logo128} 128w, ${logo256} 256w, ${logo512} 512w`}
    sizes={`${size}px`}
    alt="وادي دجلة"
    width={size}
    height={size}
    className={className ? `block ${className}` : 'block'}
    // Decoding async keeps the mark off the critical path: the sign-in card
    // paints immediately and the logo lands a frame later, rather than the
    // whole screen waiting on an image.
    decoding="async"
    style={{ objectFit: 'contain' }}
  />
);

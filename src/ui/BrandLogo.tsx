/**
 * BrandLogo — the ONE place the logo asset is referenced. Swapping in an SVG
 * later means changing only this file; no layout anywhere else moves.
 *
 * ── WHY TWO FILES AND A srcSet ───────────────────────────────────────────
 * The source asset is 3000×3000. The mark renders at 32–104px, so shipping the
 * original would cost ~250KB and a full-size decode on the very first screen a
 * user sees, to draw something the size of a thumbnail. Instead: 512 covers
 * every realistic size at 4×, 1024 covers 4K and future larger placements, and
 * the browser picks. Total: 56KB for the common case.
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
import logoUrl from '../assets/wadi-degla-logo.png';
import logo2xUrl from '../assets/wadi-degla-logo@2x.png';

export const BrandLogo: React.FC<{ size?: number; className?: string }> = ({ size = 32, className }) => (
  <img
    src={logoUrl}
    srcSet={`${logoUrl} 512w, ${logo2xUrl} 1024w`}
    sizes={`${size}px`}
    alt="وادي دجلة"
    width={size}
    height={size}
    className={className}
    // Decoding async keeps the mark off the critical path: the sign-in card
    // paints immediately and the logo lands a frame later, rather than the
    // whole screen waiting on an image.
    decoding="async"
    style={{ objectFit: 'contain', display: 'block' }}
  />
);

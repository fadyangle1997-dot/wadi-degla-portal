/**
 * Every icon, through one door: one family (lucide), one stroke, the four
 * sizes in designSystem.ICON, decorative unless it is given a name, and
 * mirrored in Arabic when it points along the reading direction (`dir`).
 *
 *   <Icon as={ArrowRight} dir />          a forward arrow, flipped in RTL
 *   <Icon as={Check} size="sm" />          inline, 13px
 *   <Icon as={Award} size="lg" label="…" /> a meaningful icon, announced
 */
import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ICON } from './designSystem';

export const Icon: React.FC<{
  as: LucideIcon;
  size?: 'sm' | 'md' | 'lg' | 'hero';
  /** Points along the reading direction: mirrored in RTL. */
  dir?: boolean;
  /** A name makes the icon meaningful; without one it is decoration. */
  label?: string;
  className?: string;
}> = ({ as: Glyph, size = 'md', dir, label, className }) => (
  <Glyph size={ICON[size]} strokeWidth={ICON.stroke}
    className={[dir && 'icon-dir', className].filter(Boolean).join(' ') || undefined}
    {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })} />
);

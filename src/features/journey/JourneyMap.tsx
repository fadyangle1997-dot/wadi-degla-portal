/**
 * The route, drawn as a road. Six stations on one winding line; the stretch
 * already travelled is gold, the road ahead is bronze. A station is a disc
 * with its title under it, and opens its detail in a sheet, so the map stays
 * a map instead of turning back into a page of cards.
 *
 * Geometry is x as a percentage of the map's width and y in pixels, so the
 * road and the discs line up at every width without measuring the DOM.
 */
import React, { useEffect, useRef, useState } from 'react';
import { m } from 'motion/react';
import { Check, Clock, Lock, Compass, ClipboardList, Building2, Route, Gavel, GraduationCap } from 'lucide-react';
import type { JourneyPhase, PhaseStatus } from '../../domain/journey/program';
import { useLang, t as tr, tf, iso } from '../../app/i18n';
import { lessonCount } from '../../app/plural';
import { EASE } from '../../ui/motion';

/** One icon per phase, in programme order: the station says what it is about. */
const ICONS = [Compass, ClipboardList, Building2, Route, Gavel, GraduationCap];

const ROW = 196;            // a station and its label on a phone of 380px or wider
const CURRENT_EXTRA = 48;   // the current disc is larger, carries a pill and a lessons line
const TOP = 64;             // the first disc's centre: room for its halo
const BOTTOM = 136;         // under the last disc: its label
const SWING = [50, 76, 50, 24];   // the road's sway, repeating; RTL starts toward the reading side

export interface MapStation {
  phase: JourneyPhase;
  status: PhaseStatus;
  current: boolean;
  /** Status in words: the disc's colour never says it alone. */
  statusLabel: string;
  /** Lessons finished in the current phase. */
  lessons?: { done: number; total: number } | null;
}

const TONE: Record<PhaseStatus, string> = {
  completed: 'jmap-meta--ready',
  waiting_trainer: 'jmap-meta--attn',
  in_progress: 'jmap-meta--gold',
  available: 'jmap-meta--gold',
  locked: '',
  planned: '',
};

export const JourneyMap: React.FC<{
  stations: readonly MapStation[];
  onOpen: (phase: JourneyPhase) => void;
}> = ({ stations, onOpen }) => {
  const lang = useLang();
  const mirror = lang === 'en';
  // Labels wrap to more lines on a narrow map, so rows grow as it narrows.
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(440);
  useEffect(() => {
    const el = box.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(([e]) => { if (e) setWidth(e.contentRect.width); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const row = width >= 380 ? ROW : Math.round(ROW + (380 - width) * 0.5);
  const xs = stations.map((_, i) => { const x = SWING[i % SWING.length]!; return mirror ? 100 - x : x; });
  const ys: number[] = [];
  stations.forEach((_, i) => { ys.push(i === 0 ? TOP : ys[i - 1]! + row + (stations[i - 1]!.current ? CURRENT_EXTRA : 0)); });
  const height = (ys[ys.length - 1] ?? TOP) + BOTTOM + (row - ROW);

  // The road reaches the current station; with none current, every phase is behind.
  const reached = stations.findIndex(s => s.current);
  const travelledTo = reached === -1 ? (stations.every(s => s.status === 'completed') ? stations.length - 1 : 0) : reached;

  // Each leg leaves a station sideways and arrives at the next from above, so
  // it never runs through the label under a disc.
  const leg = (i: number) => {
    const [x1, y1, x2, y2] = [xs[i]!, ys[i]!, xs[i + 1]!, ys[i + 1]!];
    return `M ${x1} ${y1} C ${x2} ${y1}, ${x2} ${y1}, ${x2} ${y1 + (y2 - y1) * 0.45} L ${x2} ${y2}`;
  };
  const legs = stations.slice(0, -1).map((_, i) => leg(i));
  const travelled = legs.slice(0, travelledTo).join(' ');

  return (
    <div ref={box} className="jmap" style={{ height }}>
      <svg className="jmap-road" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden focusable="false">
        <defs>
          <linearGradient id="jmap-gold" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={height}>
            <stop offset="0" stopColor="var(--g1)" />
            <stop offset="1" stopColor="var(--g2)" />
          </linearGradient>
        </defs>
        <path d={legs.join(' ')} className="jmap-road-ahead" vectorEffect="non-scaling-stroke" />
        {travelled && <path d={travelled} className="jmap-road-glow" vectorEffect="non-scaling-stroke" />}
        {travelled && <path d={travelled} className="jmap-road-done" stroke="url(#jmap-gold)" vectorEffect="non-scaling-stroke" />}
      </svg>

      <ol className="jmap-stations m-0" role="list">
        {stations.map((s, i) => {
          const Icon = ICONS[i] ?? Compass;
          const done = s.status === 'completed';
          const locked = s.status === 'locked' || s.status === 'planned';
          const waiting = s.status === 'waiting_trainer';
          const state = s.current ? 'current' : done ? 'done' : locked ? 'locked' : 'open';
          const disc = s.current ? 104 : 84;
          const pct = s.lessons && s.lessons.total ? Math.round((s.lessons.done / s.lessons.total) * 100) : 0;
          return (
            <li key={s.phase.id} className="jmap-station" style={{ left: `${xs[i]}%`, top: ys[i]! - disc / 2 }}>
              <m.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 + i * 0.07, duration: 0.32, ease: EASE }}>
                <button type="button" className={`jmap-btn jmap-btn--${state}`} onClick={() => onOpen(s.phase)}
                  aria-current={s.current ? 'step' : undefined}>
                  <span className={`jmap-disc jmap-disc--${state}${s.phase.milestone ? ' jmap-disc--milestone' : ''}`}>
                    {s.current && <span className="jmap-ring" aria-hidden style={{ '--p': pct } as React.CSSProperties} />}
                    <Icon size={32} aria-hidden />
                    {done && <span className="jmap-badge jmap-badge--done" aria-hidden><Check size={16} /></span>}
                    {locked && <span className="jmap-badge jmap-badge--locked" aria-hidden><Lock size={13} /></span>}
                    {waiting && <span className="jmap-badge jmap-badge--attn" aria-hidden><Clock size={13} /></span>}
                    {s.current && <span className="jmap-here">{tr('jr.youarehere', lang)}</span>}
                  </span>
                  <span className="jmap-label">
                    <span className="jmap-title">{s.phase.title}</span>
                    <span className="jmap-meta">
                      <span className="jmap-days">{tr('jr.day', lang)} {s.phase.dayStart}–{s.phase.dayEnd}</span>
                      {/* A done or current disc already shows its state (the check,
                          «أنت هنا»); the word stays for screen readers. */}
                      {done || s.current
                        ? <span className="sr-only"> · {s.statusLabel}</span>
                        : <> · <span className={TONE[s.status]}>{s.statusLabel}</span></>}
                    </span>
                    {s.current && s.lessons && (
                      <span className="jmap-meta">{tf('db.lessonsdone', { done: iso(s.lessons.done), total: lessonCount(s.lessons.total, lang) }, lang)}</span>
                    )}
                  </span>
                </button>
              </m.div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

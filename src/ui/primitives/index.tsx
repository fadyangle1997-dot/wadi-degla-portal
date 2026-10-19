/**
 * UI primitives — the component library (Phase 3, Design System).
 * ONE definition per pattern; interactive visuals live in theme.css classes
 * (hover/focus/active need pseudo-states), layout stays here. Every component
 * is consumed by Academy today and Trainer/Manager/Admin tomorrow.
 * Rule: Arabic text never receives letter-spacing or uppercase.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, X, ChevronLeft, Info } from 'lucide-react';
import { WIDTH } from '../designSystem';
import { t, langStore, useLang } from '../../app/i18n';

/* ---------------- surfaces ---------------- */
/**
 * Capsule — a value that rides on something else.
 *
 * The academy's signature small shape: fully round, material surface, gold
 * numeral. It exists so that no screen has to hand-roll «a little pill with a
 * number in it» — which is exactly how eleven slightly different pills happen.
 */
export const Capsule: React.FC<{ children: React.ReactNode; label?: string; style?: Pick<React.CSSProperties, 'position' | 'insetInlineEnd' | 'insetInlineStart' | 'bottom' | 'top'> }> = ({ children, label, style }) => (
  <span
    aria-label={label}
    /* `display` lives in the CSS class: an inline display would outrank the
       media query that hides this capsule on phones. */
    className="capsule"
    style={{
      background: 'var(--s0)', border: '1px solid var(--line-2)',
      borderRadius: 'var(--r-full)', padding: 'var(--sp-1) var(--sp-3)',
      fontSize: '.7rem', fontWeight: 600, color: 'var(--g1)',
      boxShadow: 'var(--e-raised)', whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

/**
 * Card — the platform's one surface. `tone` and `pad` instead of free-form
 * style, so cards stay alike; layout props (margin, width, grid placement)
 * pass through because they belong to the parent.
 *
 *   default — a surface. Most things.
 *   raised  — sits above the page. Today's work, dialogs.
 *   accent  — the one card on screen that matters most. Gold edge, used sparingly:
 *             two accent cards means neither is the accent.
 *   quiet   — recedes. Metadata, secondary context.
 */
type CardTone = 'default' | 'raised' | 'accent' | 'quiet';

const CARD_TONE: Record<CardTone, React.CSSProperties> = {
  default: { background: 'var(--s-1)', border: '1px solid var(--line)' },
  raised:  { background: 'var(--s0)',  border: '1px solid var(--line-2)', boxShadow: 'var(--e-raised)' },
  accent:  { background: 'var(--s0)',  border: '1px solid var(--g3)',     boxShadow: 'var(--e-raised)' },
  quiet:   { background: 'transparent', border: '1px solid var(--line)' },
};

export const Card: React.FC<
  Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
    tone?: CardTone;
    /** Padding step. The card owns its inner space; callers own the outer. */
    pad?: 4 | 5 | 6;
    /** Layout only — margin, width, grid placement. Never surface properties. */
    layout?: Pick<React.CSSProperties, 'margin' | 'marginBottom' | 'marginTop' | 'width' | 'maxWidth' | 'gridColumn' | 'flex'>;
  }
> = ({ tone = 'default', pad = 5, layout, children, ...p }) => (
  <div
    style={{
      ...CARD_TONE[tone],
      borderRadius: 'var(--r-lg)',
      padding: `var(--sp-${pad})`,
      ...layout,
    }}
    {...p}
  >
    {children}
  </div>
);

export const Eyebrow: React.FC<{ children: React.ReactNode; icon?: React.ReactNode }> = ({ children, icon }) => (
  <span className="t-eyebrow items-center gap-2" style={{ display: 'inline-flex' }}>{icon}{children}</span>
);

/* ---------------- button ---------------- */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary' | 'ghost'; }
export const Button = React.forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'primary', className = '', children, ...p }, ref,
) {
  return (
    <button ref={ref} className={`btn btn-${variant} ${className}`} {...p}>{children}</button>
  );
});

/* ---------------- callout ---------------- */
type Tone = 'note' | 'objective' | 'warning' | 'summary';
const TONES: Record<Tone, { c: string; bg: string; label: string }> = {
  objective: { c: 'var(--g2)', bg: 'rgba(var(--g2-rgb),.07)', label: 'الهدف' },
  note: { c: 'var(--info)', bg: 'var(--info-bg)', label: 'ملاحظة' },
  warning: { c: 'var(--attn)', bg: 'var(--attn-bg)', label: 'انتبه' },
  summary: { c: 'var(--ready)', bg: 'var(--ready-bg)', label: 'الخلاصة' },
};
export const Callout: React.FC<{ tone: Tone; title?: string; children: React.ReactNode }> = ({ tone, title, children }) => {
  const t = TONES[tone];
  return (
    <div style={{ background: t.bg, borderRight: `2px solid ${t.c}`, borderRadius: 'var(--r-sm)', padding: 'var(--sp-4) var(--sp-5)' }}>
      <div className="t-label mb-2" style={{ color: t.c }}>{title ?? t.label}</div>
      <div className="t-body">{children}</div>
    </div>
  );
};

/* ---------------- feedback block (answered → explanation → continue) ----------------
   Owns aria-live and moves focus to the continue button — the SAME behaviour in
   quick quizzes, unit exams and boss battles. */
export const FeedbackBlock: React.FC<{
  tone: Tone; title?: string; children: React.ReactNode;
  actionLabel: React.ReactNode; onAction: () => void;
}> = ({ tone, title, children, actionLabel, onAction }) => {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div role="status" aria-live="polite">
      <Callout tone={tone} title={title}>{children}</Callout>
      <div className="mt-5">
        <Button ref={ref} onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
};

/* ---------------- prices disclaimer ---------------- */
export const PricesNote: React.FC<{ text: string }> = ({ text }) => (
  <div className="row gap-2 items-start" style={{ padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-sm)', background: 'rgba(var(--g2-rgb),.05)', border: '1px solid rgba(var(--g2-rgb),.16)' }}>
    <Info size={16} className="c-g2 no-shrink mt-1" />
    <span className="t-sm">{text}</span>
  </div>
);

/* ---------------- answer option ---------------- */
export const OptionButton: React.FC<{
  text: string;
  state: 'idle' | 'correct' | 'wrong' | 'dim';
  onPick: () => void;
}> = ({ text, state, onPick }) => (
  <button
    disabled={state !== 'idle'}
    onClick={onPick}
    aria-pressed={state !== 'idle' && state !== 'dim'}
    className={`option ${state === 'idle' ? 'option-idle' : ''} ${state === 'correct' ? 'option-correct' : ''} ${state === 'wrong' ? 'option-wrong' : ''}`}>
    {state === 'correct' ? <Check size={16} className="c-ready no-shrink" />
      : state === 'wrong' ? <X size={16} className="c-risk no-shrink" />
      : state === 'dim' ? <span style={{ width: 17 }} /> : null}
    {text}
  </button>
);

/* ---------------- Arabic content island ----------------
   Learning content is Arabic in both interface languages, so the block
   declares it: lang="ar" switches a screen reader's voice, dir="rtl" restores
   the flow, and unicode-bidi: isolate (in .ar-content) keeps the direction
   from leaking into the surrounding sentence. */
export const ArabicContent: React.FC<{
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'main' | 'span';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}> = ({ children, as: Tag = 'div', className, style, ariaLabel }) => (
  <Tag lang="ar" dir="rtl" aria-label={ariaLabel} className={className ? `ar-content ${className}` : 'ar-content'} style={style}>
    {children}
  </Tag>
);

/* ---------------- screen header ---------------- */
export const ScreenHeader: React.FC<{
  onBack?: () => void;
  leading?: React.ReactNode;
  rail?: React.ReactNode;
  trailing?: React.ReactNode;
  maxWidth?: number;
  /** Defaults to the trainee's reading column — the header column is the page
   *  column; a header that centres on a different width than the content under
   *  it is a misalignment nobody reports and everybody sees. */
  /**
     * Tab routes collapse to a plain, scrolling line on phones: the shell header
     * plus this bar plus the tab bar took a quarter of the screen, and the bottom
     * tab bar already names the screen and offers the way back. Screens without a
     * tab (lesson, profile, review) keep the sticky bar and back button.
     */
  tabRoute?: boolean;
}> = ({ onBack, leading, rail, trailing, maxWidth = WIDTH.read, tabRoute }) => (
  /* A <div>, not <header>: the shell owns the page's one banner landmark. */
  /* …and a <nav>, not a bare <div>: everything interactive in this bar is
     navigation — the back control, and on the admin screens the section tabs —
     so it is a NAMED landmark. That keeps every screen's content inside a
     landmark (axe: region ×10) while the page still has exactly one banner. */
  <nav
    aria-label={t('a11y.screenbar', langStore.get())}
    /* A tab header that carries ACTIONS (the admin's section tabs, «إضافة
       مستخدم») is not furniture — hiding it whole on a phone would have taken
       the admin's entire sub-navigation off mobile. Bare headers disappear;
       headers with work in them keep the work and drop only the back button
       and the label the tab bar already shows. */
    className={tabRoute ? `screen-header screen-header--tab${trailing || rail ? '' : ' screen-header--bare'}` : 'screen-header'}
    style={{ background: 'var(--overlay)', borderBottom: '1px solid var(--line)' }}>
    <div className="row items-center gap-3 wrap" style={{ maxWidth, margin: '0 auto', padding: 'var(--sp-3) var(--sp-5)' }}>
      {onBack && (
        <button onClick={onBack} aria-label={t('ex.backtopath', langStore.get())} className="back-btn">
          <ChevronLeft size={22} className="icon-dir" />
        </button>
      )}
      <span className="screen-header-label">{leading}</span>
      {rail && <div className="grow" style={{ minWidth: 120 }}>{rail}</div>}
      {!rail && <div className="grow" />}
      {trailing}
    </div>
  </nav>
);

/* ---------------- progress rail ---------------- */
export const ProgressRail: React.FC<{ total: number; current: number }> = ({ total, current }) => (
  <div className="row gap-1" aria-hidden>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="grow" style={{ height: 4, borderRadius: 'var(--r-full)', background: i < current ? 'var(--g3)' : i === current ? 'var(--g2)' : 'var(--line-2)', transition: 'background .3s var(--ease)' }} />
    ))}
  </div>
);

/* ---------------- status badge ----------------
   Text and ring come from the same status token (the ring is its -line
   alpha), so each badge reads as one colour. */
const BADGE = {
  ready: { c: 'var(--ready)', b: 'var(--ready-line)' },
  attn: { c: 'var(--attn)', b: 'var(--attn-line)' },
  risk: { c: 'var(--risk)', b: 'var(--risk-line)' },
  info: { c: 'var(--info)', b: 'var(--info-line)' },
  gold: { c: 'var(--g1)', b: 'rgba(var(--g2-rgb),.35)' },
  neutral: { c: 'var(--tx2)', b: 'var(--line-2)' },
};
export const StatusBadge: React.FC<{ tone: keyof typeof BADGE; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone, children, icon }) => {
  const t = BADGE[tone];
  return (
    <span className="items-center gap-1" style={{ display: 'inline-flex', padding: 'var(--sp-1) var(--sp-3)', borderRadius: 'var(--r-full)', border: `1px solid ${t.b}`, color: t.c, fontSize: '0.72rem', fontWeight: 600 }}>
      {icon}{children}
    </span>
  );
};

/* ---------------- confirm dialog ----------------
   A modal: focus moves in, Tab stays in, Escape cancels, and focus goes back
   to whatever opened it when it closes. A dialog guarding something the user
   is in the middle of (an exam) starts on the safe button, so a stray Enter
   keeps them where they were. */
export const ConfirmDialog: React.FC<{
  open: boolean; title: string; body: string;
  confirmLabel: string; danger?: boolean;
  cancelLabel?: string;
  /** Which button holds focus when the dialog opens. */
  initialFocus?: 'confirm' | 'cancel';
  onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, body, confirmLabel, danger, cancelLabel, initialFocus = 'confirm', onConfirm, onCancel }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // Callers pass inline handlers; reading the latest through a ref keeps the
  // effect below from re-running (and re-focusing) on every parent render.
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; });
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (initialFocus === 'cancel' ? cancelRef : confirmRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancelRef.current(); return; }
      if (e.key !== 'Tab' || !boxRef.current) return;
      const items = boxRef.current.querySelectorAll<HTMLElement>('button:not(:disabled)');
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener?.isConnected) opener.focus();
    };
  }, [open, initialFocus]);
  if (!open) return null;
  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div ref={boxRef} className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2 className="t-h3 m-0">{title}</h2>
        <p className="t-sm" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>{body}</p>
        <div className="row gap-3 justify-start">
          <Button ref={confirmRef} onClick={onConfirm}
            style={danger ? { background: 'var(--risk)', borderColor: 'var(--risk)', color: '#fff' } : undefined}>
            {confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>{cancelLabel ?? 'إلغاء'}</Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- assessment mode ----------------
   An exam or a boss battle opens into a different room: the void instead of
   the page, no shell, one column, and a bar that names the mode and the unit,
   shows how far along the attempt is, and offers one way out. Leaving after
   an answer asks first. Nothing glows: a test reads as serious because the
   room goes quiet, not because it is lit. */
export const AssessmentMode: React.FC<{
  /** What kind of test this is: «امتحان الوحدة», «محاكاة تشغيلية». */
  mode: string;
  /** The unit or scenario under test. */
  title: string;
  progress?: { total: number; current: number };
  /** Present while leaving would lose something; then exit asks first. */
  leaveWarning?: { title: string; body: string };
  onExit: () => void;
  children: React.ReactNode;
}> = ({ mode, title, progress, leaveWarning, onExit, children }) => {
  const [asking, setAsking] = useState(false);
  const lang = useLang();
  return (
    <div className="assess">
      <nav className="assess-bar" aria-label={t('as.bar', lang)}>
        <div className="assess-bar-row">
          <div className="assess-mode">
            <span className="t-eyebrow">{mode}</span>
            <span className="assess-title">{title}</span>
          </div>
          <div className="assess-rail">{progress && <ProgressRail total={progress.total} current={progress.current} />}</div>
          <button type="button" className="icon-btn" onClick={() => (leaveWarning ? setAsking(true) : onExit())}>
            <X size={16} aria-hidden />{t('as.exit', lang)}
          </button>
        </div>
      </nav>
      <main className="assess-body">{children}</main>
      {leaveWarning && (
        <ConfirmDialog open={asking} title={leaveWarning.title} body={leaveWarning.body}
          confirmLabel={t('as.leave', lang)} cancelLabel={t('as.stay', lang)} initialFocus="cancel"
          onConfirm={onExit} onCancel={() => setAsking(false)} />
      )}
    </div>
  );
};

/* ---------------- toast ---------------- */
export const Toast: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div className="toast" role="status" aria-live="polite">
      <Check size={13} className="c-ready" />{message}
    </div>
  ) : null;

/* ---------------- skill bar ---------------- */
export const SkillBar: React.FC<{ pct: number; segments?: number }> = ({ pct, segments = 8 }) => {
  const filled = Math.round(pct * segments);
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}
      className="row gap-1">
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} className="grow" style={{ height: 6, borderRadius: 'var(--r-full)', background: i < filled ? 'var(--g2)' : 'var(--line-2)', transition: 'background .3s var(--ease)' }} />
      ))}
    </div>
  );
};

/* ---------------- empty & loading states ---------------- */
/**
 * The heading level is the caller's to state, because only the caller knows
 * the outline it sits in; the default is right directly under a page title.
 */
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode; headingLevel?: 2 | 3 }> =
  ({ icon, title, body, action, headingLevel = 2 }) => (
    <div className="stack text-center items-center gap-3" style={{ padding: 'var(--sp-8) var(--sp-5)' }}>
      {/* The component owns the icon size, so every empty state matches. */}
      {icon && <span className="empty-state-icon c-tx3">{icon}</span>}
      {headingLevel === 2 ? <h2 className="t-h3">{title}</h2> : <h3 className="t-h3">{title}</h3>}
      <p className="t-sm measure m-0">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );

/** Loading placeholder — reserved for async platforms (trainer/manager, Phase 4+). */
export const Skeleton: React.FC<{ height?: number; width?: string }> = ({ height = 16, width = '100%' }) => (
  <div className="skeleton" style={{ height, width }} aria-hidden />
);

/**
 * SpineWell — the academy's signature object.
 *
 * A statement that carries weight SINKS into the page and grows a coloured spine
 * along its reading edge. Recessed rather than raised, on purpose: a raised card
 * says «notice me and move on»; a well says «this is set into the page», and the
 * eye stops because the surface itself changed under it.
 *
 * The spine is not a border. A border frames a thing; a spine points at it — and
 * in RTL it runs down the edge the eye starts from, so it is the first thing
 * seen and the last thing left.
 *
 * Wherever the academy has something that MATTERS — a rule, the professional
 * way, a verdict — it looks like this. A screenshot should be identifiable
 * without the logo.
 */
export const SpineWell: React.FC<{ children: React.ReactNode; spine?: 'rule' | 'risk'; label?: React.ReactNode }> = ({ children, spine = 'rule', label }) => (
  <div className="relative" style={{ background: 'var(--s-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4) var(--sp-5)', overflow: 'hidden' }}>
    <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: spine === 'risk' ? 'var(--risk)' : 'var(--g2)' }} />
    {label && <div className="t-label mb-2" style={{ color: spine === 'risk' ? 'var(--risk)' : 'var(--g1)' }}>{label}</div>}
    {children}
  </div>
);


/**
 * DayRing — the calendar-day progress ring (day N of the programme, with an
 * approval-percentage capsule riding on it). Extracted verbatim from
 * TrainingJourney into shared primitives so the home screen can compose the SAME
 * ring in a later step instead of a second copy. Styling, sizes, colours and the
 * capsule placement are unchanged — ownership move only.
 */
export const DayRing: React.FC<{ day: number; total: number; pct: number }> = ({ day, total, pct }) => {
  const R = 74, STROKE = 3, C = 2 * Math.PI * R;
  const size = (R + STROKE) * 2;
  const elapsed = Math.min(day / total, 1);

  return (
    /* Sized by CSS var so a media query can shrink it without touching the
       geometry maths: the SVG scales with the box via viewBox. */
    <div className="dayring relative no-shrink" style={{ width: 'var(--ring, ' + size + 'px)', height: 'var(--ring, ' + size + 'px)' }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden className="block" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line-2)" strokeWidth={STROKE} />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke="var(--g2)" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - elapsed)}
          style={{ transition: 'stroke-dashoffset var(--t-slow) var(--ease)' }}
        />
      </svg>

      <div className="stack items-center justify-center" style={{ position: 'absolute', inset: 0 }}>
        <span className="t-score">{day}</span>
        <span className="t-label c-tx3 mt-1">من {total} يوم</span>
      </div>

      {/* Approval rides ON the ring: it belongs to the same fact, and a second
          number floating beside it would compete with the first. */}
      <Capsule label={`${pct} بالمية من الوحدات معتمدة`} style={{ position: 'absolute', insetInlineEnd: 0, bottom: 'var(--sp-1)' }}>
        {pct}%
      </Capsule>
    </div>
  );
};
export { Crumbs, PageHeader, SectionNav, SectionHeader, Num, MetricStrip, Metric, Status, Brief, Meter, Initials } from './structure';
export { DataTable, type Column, type DataTableProps } from './DataTable';

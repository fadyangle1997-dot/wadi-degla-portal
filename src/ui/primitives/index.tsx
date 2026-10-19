/**
 * UI primitives — the component library (Phase 3, Design System).
 * ONE definition per pattern; interactive visuals live in theme.css classes
 * (hover/focus/active need pseudo-states), layout stays here. Every component
 * is consumed by Academy today and Trainer/Manager/Admin tomorrow.
 * Rule: Arabic text never receives letter-spacing or uppercase.
 */
import React, { useEffect, useRef } from 'react';
import { Check, X, ChevronLeft, Info } from 'lucide-react';
import { WIDTH } from '../designSystem';
import { t, langStore } from '../../app/i18n';

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
    /* 🔴 `display` LIVES IN CSS, NOT HERE — the trap this codebase has now paid
       for four times. The mobile rule that hides this capsule where it overlaps
       the shrunken day ring («.jr-hero .dayring > *:last-child { display:none }»)
       was written, shipped and believed, and never fired once: an inline
       `display:inline-flex` outranks any media query, so the capsule kept
       covering «من 60 يوم» on every phone. Only the layout properties move to
       the class; the capsule's identity stays here. */
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
 * Card — the platform's one surface.
 *
 * 🔴 THIS EXISTED AND ALMOST NOBODY USED IT. Two screens imported it; the rest
 * hand-rolled `background + border + radius + padding` inline, each picking its
 * own values. That is the entire reason cards do not feel like each other — not
 * taste, just eleven independent guesses.
 *
 * `tone` and `pad` replace the old `style` free-for-all. A spread of arbitrary
 * style is how a shared component quietly becomes eleven components again: it
 * looks shared in the import list and is not shared on screen. Layout props
 * (margin, width, grid placement) still pass through, because those belong to
 * the parent — but the card's own identity is not negotiable.
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
  <span className="t-eyebrow" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)' }}>{icon}{children}</span>
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
      <div className="t-label" style={{ color: t.c, marginBottom: 'var(--sp-2)' }}>{title ?? t.label}</div>
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
      <div style={{ marginTop: 'var(--sp-5)' }}>
        <Button ref={ref} onClick={onAction}>{actionLabel}</Button>
      </div>
    </div>
  );
};

/* ---------------- prices disclaimer ---------------- */
export const PricesNote: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ display: 'flex', gap: 'var(--sp-2)', padding: 'var(--sp-3) var(--sp-4)', borderRadius: 'var(--r-sm)',
    background: 'rgba(var(--g2-rgb),.05)', border: '1px solid rgba(var(--g2-rgb),.16)', alignItems: 'flex-start' }}>
    <Info size={16} style={{ color: 'var(--g2)', flexShrink: 0, marginTop: 'var(--sp-1)' }} />
    <span className="t-sm">{text}</span>
  </div>
);

/* ---------------- answer option ---------------- */
export const OptionButton: React.FC<{
  text: string;
  state: 'idle' | 'correct' | 'wrong' | 'dim';
  onPick: () => void;
  arena?: boolean;
}> = ({ text, state, onPick, arena }) => (
  <button
    disabled={state !== 'idle'}
    onClick={onPick}
    aria-pressed={state !== 'idle' && state !== 'dim'}
    className={`option ${state === 'idle' ? 'option-idle' : ''} ${arena && (state === 'idle' || state === 'dim') ? 'option-arena' : ''} ${state === 'correct' ? 'option-correct' : ''} ${state === 'wrong' ? 'option-wrong' : ''}`}>
    {state === 'correct' ? <Check size={16} style={{ color: 'var(--ready)', flexShrink: 0 }} />
      : state === 'wrong' ? <X size={16} style={{ color: 'var(--risk)', flexShrink: 0 }} />
      : state === 'dim' ? <span style={{ width: 17 }} /> : null}
    {text}
  </button>
);

/* ---------------- Arabic content island ----------------
   🔴 THE LEARNING CONTENT IS ARABIC IN BOTH MODES — SO IT SAYS SO.

   With the document following the interface language, an English shell renders
   LTR; the lesson inside it is still Arabic and still reads right-to-left. That
   is not a conflict to paper over — it is a bilingual document, and the web has
   had an answer since HTML 4: declare the island.

   `lang="ar"` makes a screen reader switch voice and phonetics at the boundary
   instead of pronouncing Arabic with an English engine; `dir="rtl"` restores
   right-to-left flow for the block; `unicode-bidi: isolate` (in .ar-content)
   stops the island's direction from leaking into the sentence around it.
   Declared at the CONTENT BLOCK, never at the document — which is exactly the
   distinction the old fixed `dir="rtl"` could not make. */
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
  tone?: 'default' | 'arena';
  maxWidth?: number;
  /** Defaults to the trainee's reading column — the header column is the page
   *  column; a header that centres on a different width than the content under
   *  it is a misalignment nobody reports and everybody sees. */
  /**
   * 🔴 TAB ROUTES DO NOT GET A SECOND BAR ON A PHONE.
   *
   * Measured at 390×844: the shell header (89px) and this header (76px) stacked
   * to 165px, with a 57px tab bar below — 222px, **26% of the viewport**, spent
   * on chrome before a single word of content, on the three screens the trainee
   * opens most. And the bar was repeating what the phone already said: a back
   * arrow to a screen that is one tap away in the tab bar, above a label naming
   * the tab that is already highlighted in it.
   *
   * On a phone this collapses to a plain line that scrolls away with the
   * content; the desktop bar, where there is no tab bar and the column is
   * narrow, is untouched. Screens with no tab of their own — lesson, exam,
   * profile, the arena — keep the sticky bar and the back button on every
   * viewport, because there the back button IS the only way out.
   */
  tabRoute?: boolean;
}> = ({ onBack, leading, rail, trailing, tone = 'default', maxWidth = WIDTH.read, tabRoute }) => (
  /* 🔴 A <header> HERE WAS A SECOND BANNER LANDMARK. The shell already owns the
     page's banner; this bar is a screen-level toolbar sitting inside it, and
     marking it <header> gave every screen two banners with no way for a screen
     reader user to tell them apart (axe: landmark-no-duplicate-banner ×10,
     landmark-unique ×10). It is a <div> now — the bar loses nothing, and the
     page has exactly one banner again. */
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
    style={{
      background: tone === 'arena' ? 'var(--overlay-arena)' : 'var(--overlay)',
      borderBottom: `1px solid ${tone === 'arena' ? 'rgba(var(--g2-rgb),.3)' : 'var(--line)'}`,
    }}>
    <div style={{ maxWidth, margin: '0 auto', padding: 'var(--sp-3) var(--sp-5)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
      {onBack && (
        <button onClick={onBack} aria-label={t('ex.backtopath', langStore.get())} className="back-btn">
          <ChevronLeft size={22} className="icon-dir" />
        </button>
      )}
      <span className="screen-header-label">{leading}</span>
      {rail && <div style={{ flex: 1, minWidth: 120 }}>{rail}</div>}
      {!rail && <div style={{ flex: 1 }} />}
      {trailing}
    </div>
  </nav>
);

/* ---------------- progress rail ---------------- */
export const ProgressRail: React.FC<{ total: number; current: number; emphasis?: boolean }> = ({ total, current, emphasis }) => (
  <div style={{ display: 'flex', gap: 'var(--sp-1)' }} aria-hidden>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} style={{
        height: 4, flex: 1, borderRadius: 'var(--r-full)',
        background: i < current ? 'var(--g3)' : i === current ? (emphasis ? 'var(--g1)' : 'var(--g2)') : 'var(--line-2)',
        transition: 'background .3s var(--ease)',
      }} />
    ))}
  </div>
);

/* ---------------- status badge ----------------
   🔴 THE BORDERS WERE THE PREVIOUS PALETTE. Every text colour here is a token,
   and three of the borders were literals left over from the saturated status
   set the system replaced: mint #3DD68C, the yellow #F5C147 — which is the
   very hue the palette comment kills, because a warning that looks like the
   primary button is not a warning — and a hot red. So each badge drew its ring
   in one colour family and its text in another, and the mismatch is the kind
   of thing that reads as «assembled» without anyone being able to name it.
   Every tone now takes its own -line token, which is the same hue as its text
   at the alpha the palette already defines. */
const BADGE = {
  ready: { c: 'var(--ready)', b: 'var(--ready-line)' },
  attn: { c: 'var(--attn)', b: 'var(--attn-line)' },
  risk: { c: 'var(--risk)', b: 'var(--risk-line)' },
  info: { c: 'var(--info)', b: 'var(--info-line)' },
  gold: { c: 'var(--g1)', b: 'rgba(var(--g2-rgb),.35)' },
  neutral: { c: 'var(--tx2)', b: 'var(--line-2)' },
};
export const StatusBadge: React.FC<{ tone: keyof typeof BADGE; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone, children, icon }) => {
  const t = BADGE[tone]!;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1)', padding: 'var(--sp-1) var(--sp-3)', borderRadius: 'var(--r-full)', border: `1px solid ${t.b}`, color: t.c, fontSize: '0.72rem', fontWeight: 600 }}>
      {icon}{children}
    </span>
  );
};

/* ---------------- confirm dialog ---------------- */
export const ConfirmDialog: React.FC<{
  open: boolean; title: string; body: string;
  confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}> = ({ open, title, body, confirmLabel, danger, onConfirm, onCancel }) => {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2 className="t-h3" style={{ margin: 0 }}>{title}</h2>
        <p className="t-sm" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>{body}</p>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-start' }}>
          <Button ref={ref} onClick={onConfirm}
            style={danger ? { background: 'var(--risk)', borderColor: 'var(--risk)', color: '#fff' } : undefined}>
            {confirmLabel}
          </Button>
          <Button variant="ghost" onClick={onCancel}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- toast ---------------- */
export const Toast: React.FC<{ message: string | null }> = ({ message }) =>
  message ? (
    <div className="toast" role="status" aria-live="polite">
      <Check size={13} style={{ color: 'var(--ready)' }} />{message}
    </div>
  ) : null;

/* ---------------- skill bar ---------------- */
export const SkillBar: React.FC<{ pct: number; segments?: number }> = ({ pct, segments = 8 }) => {
  const filled = Math.round(pct * segments);
  return (
    <div role="progressbar" aria-valuenow={Math.round(pct * 100)} aria-valuemin={0} aria-valuemax={100}
      style={{ display: 'flex', gap: 'var(--sp-1)' }}>
      {Array.from({ length: segments }, (_, i) => (
        <span key={i} style={{
          height: 6, flex: 1, borderRadius: 'var(--r-full)',
          background: i < filled ? 'var(--g2)' : 'var(--line-2)',
          transition: 'background .3s var(--ease)',
        }} />
      ))}
    </div>
  );
};

/* ---------------- empty & loading states ---------------- */
/**
 * 🔴 THE EMPTY STATE WAS ALWAYS AN <h3>. Dropped under an <h1> it skipped a
 * level (axe: heading-order), and a screen-reader user navigating by heading
 * met a level-3 with no level-2 above it — the outline says «you are inside a
 * subsection» when the screen has no subsections. The level is now the
 * caller's to state, because only the caller knows the outline it sits in; it
 * defaults to the level that is correct directly under a page title.
 */
export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; body: string; action?: React.ReactNode; headingLevel?: 2 | 3 }> =
  ({ icon, title, body, action, headingLevel = 2 }) => (
    <div style={{ textAlign: 'center', padding: 'var(--sp-8) var(--sp-5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
      {/* 🔴 THE COMPONENT OWNS THE ICON SIZE. Empty states shipped at two sizes
          at once — 22 on the trainee's screens, 26 on the trainer's, manager's
          and admin's — because the size was passed in by each caller. Same
          component, same moment in the product, two sizes, split by whoever
          wrote the screen. The class pins it, so a caller's `size` can no
          longer leak into the system. */}
      {icon && <span className="empty-state-icon" style={{ color: 'var(--tx3)' }}>{icon}</span>}
      {headingLevel === 2 ? <h2 className="t-h3">{title}</h2> : <h3 className="t-h3">{title}</h3>}
      <p className="t-sm measure" style={{ margin: 0 }}>{body}</p>
      {action && <div style={{ marginTop: 'var(--sp-3)' }}>{action}</div>}
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
 * says «notice me and move on»; a well says «this is set into the page».
 *
 * Extracted from LessonFlow (where it was defined and used six times) into the
 * shared primitives so every screen composes from the same object instead of
 * redefining it. Styling, spacing and colours are unchanged — this is an
 * ownership move only.
 */
export const SpineWell: React.FC<{ children: React.ReactNode; spine?: 'rule' | 'risk'; label?: React.ReactNode }> = ({ children, spine = 'rule', label }) => (
  <div style={{ position: 'relative', background: 'var(--s-2)', borderRadius: 'var(--r-md)', padding: 'var(--sp-4) var(--sp-5)', overflow: 'hidden' }}>
    <span aria-hidden style={{ position: 'absolute', insetInlineStart: 0, top: 0, bottom: 0, width: 3, background: spine === 'risk' ? 'var(--risk)' : 'var(--g2)' }} />
    {label && <div className="t-label" style={{ color: spine === 'risk' ? 'var(--risk)' : 'var(--g1)', marginBottom: 'var(--sp-2)' }}>{label}</div>}
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
    <div className="dayring" style={{ position: 'relative', width: 'var(--ring, ' + size + 'px)', height: 'var(--ring, ' + size + 'px)', flexShrink: 0 }}>
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" height="100%" aria-hidden style={{ display: 'block', transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--line-2)" strokeWidth={STROKE} />
        <circle
          cx={size / 2} cy={size / 2} r={R} fill="none"
          stroke="var(--g2)" strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - elapsed)}
          style={{ transition: 'stroke-dashoffset var(--t-slow) var(--ease)' }}
        />
      </svg>

      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span className="t-num" style={{ fontSize: '3rem', fontWeight: 600, color: 'var(--tx0)', lineHeight: 1, letterSpacing: '-.03em' }}>
          {day}
        </span>
        <span className="t-label" style={{ color: 'var(--tx3)', marginTop: 'var(--sp-1)' }}>من {total} يوم</span>
      </div>

      {/* Approval rides ON the ring: it belongs to the same fact, and a second
          number floating beside it would compete with the first. */}
      <Capsule label={`${pct} بالمية من الوحدات معتمدة`} style={{ position: 'absolute', insetInlineEnd: 0, bottom: 'var(--sp-1)' }}>
        {pct}%
      </Capsule>
    </div>
  );
};
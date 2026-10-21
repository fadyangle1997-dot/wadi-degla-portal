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
import { t, langStore, useLang, type Key, type Lang } from '../../app/i18n';
import { leaveGuard } from '../../app/leaveGuard';
import { useModal } from './useModal';

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
    /* Its look lives in the CSS class (a media query can reach it); only the
       position it rides at is the caller's. */
    className="capsule"
    style={style}
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

export const Card: React.FC<
  Omit<React.HTMLAttributes<HTMLDivElement>, 'style'> & {
    tone?: CardTone;
    /** Padding step. The card owns its inner space; callers own the outer. */
    pad?: 4 | 5 | 6;
    /** Layout only — margin, width, grid placement. Never surface properties. */
    layout?: Pick<React.CSSProperties, 'margin' | 'marginBottom' | 'marginTop' | 'width' | 'maxWidth' | 'gridColumn' | 'flex'>;
  }
> = ({ tone = 'default', pad = 5, layout, children, className, ...p }) => (
  /* Filled, not outlined: a surface is told apart by its fill (theme.css,
     .card--*). Hairlines stay for tables and ledgers. */
  <div className={`card card--${tone} card--pad-${pad}${className ? ` ${className}` : ''}`} style={layout} {...p}>
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
const TONE_LABEL: Record<Tone, string> = { objective: 'الهدف', note: 'ملاحظة', warning: 'انتبه', summary: 'الخلاصة' };
export const Callout: React.FC<{ tone: Tone; title?: string; children: React.ReactNode }> = ({ tone, title, children }) => (
  <div className={`callout callout--${tone}`}>
    <div className="t-label mb-2 callout-label">{title ?? TONE_LABEL[tone]}</div>
    <div className="t-body">{children}</div>
  </div>
);

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
    className={`option ${state === 'idle' ? 'option-idle' : ''} ${state === 'correct' ? 'option-correct' : ''} ${state === 'wrong' ? 'option-wrong' : ''}`}>
    {state === 'correct' ? <Check size={16} className="c-ready no-shrink" aria-hidden />
      : state === 'wrong' ? <X size={16} className="c-risk no-shrink" aria-hidden />
      : state === 'dim' ? <span style={{ width: 17 }} /> : null}
    {text}
    {/* The mark is said, not only shown: green and red are not an answer. */}
    {state === 'correct' && <span className="sr-only"> — {t('opt.correct', langStore.get())}</span>}
    {state === 'wrong' && <span className="sr-only"> — {t('opt.wrong', langStore.get())}</span>}
  </button>
);

/* ---------------- Arabic content island ----------------
   Learning content is Arabic in both interface languages, so the block
   declares it: lang="ar" switches a screen reader's voice, dir="rtl" restores
   the flow, and unicode-bidi: isolate (in .ar-content) keeps the direction
   from leaking into the surrounding sentence. */
export const ArabicContent: React.FC<{
  children: React.ReactNode;
  as?: 'div' | 'section' | 'article' | 'main' | 'span' | 'blockquote';
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}> = ({ children, as: Tag = 'div', className, style, ariaLabel }) => (
  <Tag lang="ar" dir="rtl" aria-label={ariaLabel} className={className ? `ar-content ${className}` : 'ar-content'} style={style}>
    {children}
  </Tag>
);

/**
 * Learning content quoted inside interface text. Unit titles, rules and
 * people's names are written in Arabic and are not translated; inside an
 * English sentence they stay marked as Arabic, so they read — and are read
 * aloud — as a quotation, not as a half-translated string.
 */
export const Content: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <bdi lang="ar" dir="rtl" className="ar-content">{children}</bdi>
);

/**
 * A translated sentence with nodes in its {placeholders} — tf() for when a
 * placeholder holds content: tx('pv.waitingbody', { m: <Content>…</Content> }, lang).
 */
export const tx = (key: Key, vars: Readonly<Record<string, React.ReactNode>>, l: Lang): React.ReactNode =>
  t(key, l).split(/\{(\w+)\}/g).map((part, i) =>
    i % 2 ? <React.Fragment key={i}>{vars[part] ?? ''}</React.Fragment> : part);

/**
 * Said once, in English, where content is read: the interface is translated,
 * the training material is not. Without it an English reader meets Arabic
 * titles and cannot tell a choice from a gap.
 */
export const ContentLanguageNote: React.FC = () => {
  const lang = useLang();
  return lang === 'en' ? <p className="t-sm c-tx2 m-0" role="note">{t('lang.contentnote', lang)}</p> : null;
};

/* ---------------- screen header ---------------- */
export const ScreenHeader: React.FC<{
  onBack?: () => void;
  /** Where Back goes, said in its name: «ارجع للمسار» was on every back
   *  button, including the ones that went to the roadmap or the manager. */
  backLabel?: string;
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
}> = ({ onBack, backLabel, leading, rail, trailing, maxWidth = WIDTH.read, tabRoute }) => (
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
      {onBack && <BackButton onClick={onBack} label={backLabel ?? t('ex.backtopath', langStore.get())} />}
      <span className="screen-header-label">{leading}</span>
      {rail && <div className="grow" style={{ minWidth: 120 }}>{rail}</div>}
      {!rail && <div className="grow" />}
      {trailing}
    </div>
  </nav>
);

/* ---------------- progress rail ---------------- */
export const ProgressRail: React.FC<{ total: number; current: number }> = ({ total, current }) => (
  <div className="prail" aria-hidden>
    {Array.from({ length: total }, (_, i) => (
      <div key={i} className="prail-seg" data-state={i < current ? 'done' : i === current ? 'now' : 'todo'} />
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
  // Waiting on someone else: neutral ink, dashed edge — reads apart from
  // `neutral` without relying on colour (ui/statusSemantics).
  pending: { c: 'var(--tx1)', b: 'var(--line-3)' },
};
export const StatusBadge: React.FC<{ tone: keyof typeof BADGE; children: React.ReactNode; icon?: React.ReactNode }> = ({ tone, children, icon }) => {
  const t = BADGE[tone];
  return (
    <span className="items-center gap-1" style={{ display: 'inline-flex', padding: 'var(--sp-1) var(--sp-3)', borderRadius: 'var(--r-full)', border: `1px ${tone === 'pending' ? 'dashed' : 'solid'} ${t.b}`, color: t.c, fontSize: '.875rem', fontWeight: 600 }}>
      {icon}{children}
    </span>
  );
};

/* ---------------- confirm dialog ----------------
   A modal: focus moves in, Tab stays in, Escape cancels, and focus goes back
   to whatever opened it when it closes. A dialog guarding something the user
   is in the middle of (an exam) starts on the safe button, so a stray Enter
   keeps them where they were. */
export interface ConfirmDialogProps {
  open: boolean; title: string; body: string;
  confirmLabel: string; danger?: boolean;
  cancelLabel?: string;
  /** Which button holds focus when the dialog opens. */
  initialFocus?: 'confirm' | 'cancel';
  onConfirm: () => void; onCancel: () => void;
}
export const ConfirmDialog: React.FC<ConfirmDialogProps> = p => (p.open ? <ConfirmDialogOpen {...p} /> : null);

const ConfirmDialogOpen: React.FC<ConfirmDialogProps> = ({ title, body, confirmLabel, danger, cancelLabel, initialFocus, onConfirm, onCancel }) => {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // A destructive dialog starts on the safe button, so a stray Enter cancels.
  const startOn = initialFocus ?? (danger ? 'cancel' : 'confirm');
  const boxRef = useModal<HTMLDivElement>(onCancel, () => (startOn === 'cancel' ? cancelRef : confirmRef).current);
  return (
    <div className="dialog-scrim" onClick={onCancel}>
      <div ref={boxRef} className="dialog" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}>
        <h2 className="t-h3 m-0">{title}</h2>
        <p className="t-sm" style={{ margin: 'var(--sp-3) 0 var(--sp-5)' }}>{body}</p>
        <div className="row gap-3 justify-start wrap">
          <Button ref={confirmRef} onClick={onConfirm} className={danger ? 'btn-destroy' : undefined}>
            {confirmLabel}
          </Button>
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>{cancelLabel ?? t('dlg.cancel', langStore.get())}</Button>
        </div>
      </div>
    </div>
  );
};

/* ---------------- form field ----------------
   A visible label (never a placeholder standing in for one: it disappears the
   moment you type, and low-contrast placeholder text is the first thing a
   low-vision reader loses), an optional hint, and the error next to the field
   that caused it — wired to the control with aria-invalid/aria-describedby. */
export interface FieldControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
  'aria-required'?: true;
}
export const FormField: React.FC<{
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: (control: FieldControlProps) => React.ReactNode;
}> = ({ id, label, hint, error, required, children }) => {
  const lang = useLang();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [errId, hintId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="form-field">
      <label htmlFor={id} className="form-label">
        {label}{!required && <span className="form-optional"> · {t('form.optional', lang)}</span>}
      </label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy, 'aria-required': required ? true : undefined })}
      {/* Not an alert: focus is moved to the field, and the field's description reads it. */}
      {error && <p id={errId} className="form-error"><X size={13} aria-hidden /> {error}</p>}
      {hint && <p id={hintId} className="form-hint">{hint}</p>}
    </div>
  );
};

/* ---------------- back · close ----------------
   Two different promises. Back returns to the previous screen and names it;
   Close dismisses an overlay and never navigates. Neither is interchangeable
   with Cancel (abandon an action) or Exit (leave a flow that holds work). */
export const BackButton: React.FC<{ onClick: () => void; label: string }> = ({ onClick, label }) => (
  <button type="button" onClick={onClick} aria-label={label} title={label} className="back-btn">
    <ChevronLeft size={22} className="icon-dir" aria-hidden />
  </button>
);

export const CloseButton: React.FC<{ onClick: () => void; label?: string }> = ({ onClick, label }) => {
  const name = label ?? t('dlg.close', langStore.get());
  return (
    <button type="button" onClick={onClick} aria-label={name} title={name} className="back-btn no-shrink">
      <X size={22} aria-hidden />
    </button>
  );
};

/* ---------------- loading · error ----------------
   Every data screen answers «what happened, and what can I do now». */
export const LoadingState: React.FC<{ label?: string }> = ({ label }) => (
  <div role="status" className="loading-state">
    <span className="sr-only">{label ?? t('sh.loading', langStore.get())}</span>
    <Skeleton height={28} width="45%" />
    <Skeleton height={16} width="80%" />
    <Skeleton height={16} width="65%" />
  </div>
);

export const ErrorState: React.FC<{
  title: string; body: string;
  onRetry?: () => void; retryLabel?: string;
  secondary?: React.ReactNode;
}> = ({ title, body, onRetry, retryLabel, secondary }) => (
  <div role="alert" className="error-state">
    <h2 className="t-h3 m-0">{title}</h2>
    <p className="t-sm measure m-0">{body}</p>
    <div className="row gap-3 wrap mt-3">
      {onRetry && <Button onClick={onRetry}>{retryLabel ?? t('err.retry', langStore.get())}</Button>}
      {secondary}
    </div>
  </div>
);

/* ---------------- exit flow ----------------
   Leaving a flow that holds unsaved work asks first — from its own exit
   control and from the browser's Back alike (through leaveGuard). Returns the
   way to ask and the dialog to render. Without work to lose it never asks. */
export function useExitFlow(holding: boolean, copy: { title: string; body: string; leaveLabel?: string; stayLabel?: string }) {
  const lang = useLang();
  const [asking, setAsking] = useState(false);
  const proceedRef = useRef<() => void>(() => undefined);
  useEffect(() => {
    if (!holding) return;
    return leaveGuard.hold({ ask: proceed => { proceedRef.current = proceed; setAsking(true); } });
  }, [holding]);
  const leave = (go: () => void) => {
    if (!holding) { go(); return; }
    proceedRef.current = go;
    setAsking(true);
  };
  const dialog = (
    <ConfirmDialog open={asking} title={copy.title} body={copy.body}
      confirmLabel={copy.leaveLabel ?? t('as.leave', lang)} cancelLabel={copy.stayLabel ?? t('as.stay', lang)} initialFocus="cancel"
      onConfirm={() => { setAsking(false); proceedRef.current(); }} onCancel={() => setAsking(false)} />
  );
  return { leave, dialog };
}

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
  const lang = useLang();
  const { leave, dialog } = useExitFlow(!!leaveWarning, leaveWarning ?? { title: '', body: '' });
  const exit = () => leave(onExit);
  return (
    <div className="assess">
      <nav className="assess-bar" aria-label={t('as.bar', lang)}>
        <div className="assess-bar-row">
          <div className="assess-mode">
            <span className="t-eyebrow">{mode}</span>
            <span className="assess-title">{title}</span>
          </div>
          <div className="assess-rail">{progress && <ProgressRail total={progress.total} current={progress.current} />}</div>
          <button type="button" className="icon-btn" onClick={exit}>
            <X size={16} aria-hidden />{t('as.exit', lang)}
          </button>
        </div>
      </nav>
      <main className="assess-body">{children}</main>
      {dialog}
    </div>
  );
};

/* ---------------- toast ---------------- */
/** A passing confirmation, or — with tone="error" — a failure the person must
 *  hear about (role="alert"). A check mark on a failure was a lie. */
export const Toast: React.FC<{ message: string | null; tone?: 'ok' | 'error' }> = ({ message, tone = 'ok' }) =>
  message ? (
    <div className="toast" role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'}>
      {tone === 'error' ? <X size={13} className="c-risk" aria-hidden /> : <Check size={13} className="c-ready" aria-hidden />}{message}
    </div>
  ) : null;

/** A failure next to the control that caused it, with the work still in place. */
export const InlineError: React.FC<{ message: string | null }> = ({ message }) =>
  message ? <p role="alert" className="t-sm c-risk m-0">{message}</p> : null;

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
  <div className={`spine spine--${spine}`}>
    <span aria-hidden className="spine-bar" />
    {label && <div className="t-label mb-2 spine-label">{label}</div>}
    {children}
  </div>
);


/**
 * DayRing — day N of the programme as a ring, with the approval percentage
 * riding on it as a capsule.
 */
export const DayRing: React.FC<{ day: number; total: number; pct: number }> = ({ day, total, pct }) => {
  const lang = useLang();
  const elapsed = Math.min(day / total, 1);
  return (
    /* Sized by --ring so a media query can shrink it; the number inside
       shrinks with it (.dayring-day), so nothing ever sits on the ring. */
    <div className="dayring relative no-shrink">
      {/* The ring IS the progress: a native <progress>, so a screen reader
          hears «day 43 of 60» and the drawing stays CSS. */}
      <progress className="dayring-track" value={Math.min(day, total)} max={total}
        aria-label={`${t('jr.day', lang)} ${day} ${t('jr.of', lang)} ${total}`}
        style={{ '--value': Math.round(elapsed * 100) } as React.CSSProperties} />
      <div className="dayring-content" aria-hidden>
        <span className="dayring-day">{day}</span>
        <span className="dayring-total">{t('jr.of', lang)} {total} {t('jr.days', lang)}</span>
      </div>
      {/* Approval rides ON the ring: it belongs to the same fact, and a second
          number floating beside it would compete with the first. */}
      <Capsule label={`${pct}% ${t('jr.unitsapp', lang)}`} style={{ position: 'absolute', insetInlineEnd: 0, bottom: 'var(--sp-1)' }}>
        {pct}%
      </Capsule>
    </div>
  );
};
export { Crumbs, PageHeader, SectionNav, SectionHeader, Num, MetricStrip, Metric, Status, Brief, Meter, Initials } from './structure';
export { DataTable, type Column, type DataTableProps } from './DataTable';
export { useModal } from './useModal';

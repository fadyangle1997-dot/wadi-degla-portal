/**
 * Page structure: where am I, what matters, what next.
 *
 * Every screen opens with a PageHeader (context path, title, one line of
 * context, the primary action), then regions introduced by a SectionHeader.
 * Regions are not boxes: a heading and the space around it group content, and
 * a surface is reserved for the one thing on the screen that must be acted on.
 */
import React from 'react';
import { useLang, t } from '../../app/i18n';
import { initialsOf } from '../../domain/identity/display';

/* ---------------- page header ---------------- */
/** The context path, outermost first; the last entry is the current page. */
export const Crumbs: React.FC<{ items: readonly React.ReactNode[] }> = ({ items }) => {
  const lang = useLang();
  return (
    <nav className="crumbs" aria-label={t('a11y.crumbs', lang)}>
      <ol>
        {items.map((c, i) => (
          <li key={i} aria-current={i === items.length - 1 ? 'page' : undefined}>{c}</li>
        ))}
      </ol>
    </nav>
  );
};

export const PageHeader: React.FC<{
  /** The context path, outermost first; the last entry is this page. */
  crumbs?: readonly React.ReactNode[];
  title: React.ReactNode;
  /** One line that summarises the page's state, not a description of the page. */
  lead?: React.ReactNode;
  /** The page's primary action, and at most one secondary. */
  actions?: React.ReactNode;
  /** Section navigation for pages that have sections. */
  nav?: React.ReactNode;
}> = ({ crumbs, title, lead, actions, nav }) => (
    <header className="page-header">
      {crumbs && crumbs.length > 0 && <Crumbs items={crumbs} />}
      <div className="page-header-row">
        <div className="page-header-text">
          <h1 className="t-h1 m-0">{title}</h1>
          {lead && <p className="t-sm m-0 page-lead">{lead}</p>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {nav}
    </header>
);

/**
 * Section navigation under a page title: one row of sections, the current one
 * marked with the gold spine. Buttons, not links: the sections are views of one
 * page, not routes.
 */
export const SectionNav: React.FC<{
  label: string;
  items: readonly { id: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}> = ({ label, items, active, onChange }) => (
  <nav className="section-nav" aria-label={label}>
    {items.map(it => (
      <button key={it.id} type="button" className="section-nav-item" aria-current={active === it.id ? 'page' : undefined}
        onClick={() => onChange(it.id)}>
        {it.icon}{it.label}
      </button>
    ))}
  </nav>
);

/* ---------------- section header ---------------- */
export const SectionHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  /** How many things the section holds, when the number is information. */
  count?: number;
  action?: React.ReactNode;
  /** The caller knows the outline; 2 under a page title. */
  level?: 2 | 3;
  id?: string;
}> = ({ title, description, count, action, level = 2, id }) => {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className="section-header">
      <div className="section-header-text">
        <H className="t-h3 m-0 row items-center gap-2" id={id}>
          {title}
          {count !== undefined && <span className="section-count t-num">{count}</span>}
        </H>
        {description && <p className="t-sm m-0">{description}</p>}
      </div>
      {action && <div className="no-shrink">{action}</div>}
    </div>
  );
};

/* ---------------- numbers ---------------- */
/**
 * A figure inside a sentence. Isolated, so a percentage at the end of an
 * Arabic line reads «73%» and never «%73», with tabular lining figures.
 */
export const Num: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <bdi className="num">{children}</bdi>
);

type Tone = 'ready' | 'attn' | 'risk' | 'pending' | 'info' | 'gold' | 'neutral';

/**
 * A row of key figures, ruled by hairlines rather than boxed into tiles: the
 * numbers are the content, so nothing competes with them.
 */
export const MetricStrip: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <div className="metric-strip-wrap"><dl className="metric-strip" aria-label={label}>{children}</dl></div>
);

export const Metric: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  /** What the figure means, in words, so tone is never the only signal. */
  context?: React.ReactNode;
  tone?: Tone;
  icon?: React.ReactNode;
}> = ({ label, value, context, tone, icon }) => (
  <div className={`metric${tone ? ` metric--${tone}` : ''}`}>
    <dt className="t-label row items-center gap-1">{icon}{label}</dt>
    <dd className="t-metric m-0">{value}</dd>
    {context && <dd className="t-sm m-0 metric-context">{context}</dd>}
  </div>
);

/* ---------------- status ---------------- */
/**
 * The state of a row: a dot and a word. Lighter than a StatusBadge, which is
 * kept for naming an object; a list of rows with a ring around every state is
 * noise.
 */
export const Status: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className={`status status--${tone}`}>
    <span className="status-dot" aria-hidden />
    {children}
  </span>
);

/* ---------------- brief ---------------- */
/**
 * The one raised surface on a screen: the decision or the next step, and its
 * one action. Everything else on the screen is a region, not a surface.
 */
export const Brief: React.FC<{
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: 'gold' | 'attn' | 'risk';
  level?: 2 | 3;
  /** The trainee's mission reads at heading size; a staff brief is quieter. */
  prominent?: boolean;
}> = ({ eyebrow, title, body, action, tone = 'gold', level = 2, prominent }) => {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <section className="brief" data-tone={tone}>
      <div className="brief-text">
        {eyebrow}
        <H className={`${prominent ? 't-h2' : 't-h3'} m-0`}>{title}</H>
        {body && (typeof body === 'string'
          ? <p className="t-sm measure m-0">{body}</p>
          : <div className="t-sm measure stack gap-2">{body}</div>)}
      </div>
      {action && <div className="brief-action">{action}</div>}
    </section>
  );
};

/* ---------------- meter & initials ---------------- */
/** A proportion as a short bar beside its figure; the figure carries the value. */
export const Meter: React.FC<{ value: number; tone?: 'gold' | 'ready' | 'attn' | 'risk' }> = ({ value, tone = 'gold' }) => (
  <span className={`meter meter--${tone}`} aria-hidden>
    <span style={{ inlineSize: `${Math.max(0, Math.min(100, value))}%` }} />
  </span>
);

/** Two letters for a person: no photo, and never a silhouette. */
export const Initials: React.FC<{ name: string }> = ({ name }) => (
  <span className="initials" aria-hidden>{initialsOf(name)}</span>
);

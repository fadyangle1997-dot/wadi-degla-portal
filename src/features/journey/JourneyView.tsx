/**
 * «المرجع» — the trainee's one reference destination: the operational rules
 * they learn, and the membership file's journey, in one place they can return
 * to on any working day.
 *
 * Nothing here is authored again. The rules are each lesson's own teaching
 * points and golden rule (content/modules), grouped by unit and searchable;
 * the journey is JOURNEY_STAGES, the eleven stages every file walks, with the
 * membership office's own stages marked «دورك هنا». The journey used to be a
 * route nothing linked to; it is now one section of a destination in the
 * navigation.
 */
import React, { useMemo, useState } from 'react';
import { m } from 'motion/react';
import { MapPin, Building2, Archive, Search } from 'lucide-react';
import { JOURNEY_STAGES, MODULES } from '../../content/registry';
import { PageHeader, StatusBadge, SectionHeader, ArabicContent, Content, ContentLanguageNote } from '../../ui/primitives';
import { useLang, t, tf, type Key } from '../../app/i18n';
import { lessonCount } from '../../app/plural';
import { useProgress } from '../../app/progress';
import { fade } from '../../ui/motion';
import { WIDTH } from '../../ui/designSystem';

/* Who owns a stage is a category, not a status: neutral chips, the trainee's
   own stages carry the brand accent (ui/statusSemantics — no blue). */
const OWNER: Record<'membership' | 'external' | 'archive', { label: Key; tone: 'gold' | 'neutral'; icon: React.ReactNode }> = {
  membership: { label: 'ref.own.membership', tone: 'gold', icon: <MapPin size={13} /> },
  external: { label: 'ref.own.external', tone: 'neutral', icon: <Building2 size={13} /> },
  archive: { label: 'ref.own.archive', tone: 'neutral', icon: <Archive size={13} /> },
};

export const JourneyView: React.FC<{ onExit: () => void }> = () => {
  const p = useProgress();
  const lang = useLang();
  const [q, setQ] = useState('');
  const query = q.trim();
  const units = useMemo(() => MODULES.map(mod => ({
    mod,
    lessons: mod.lessons
      .map(l => ({ l, points: l.points.map(pt => pt.text), golden: l.pro?.goldenRule }))
      .filter(({ l, points, golden }) => !query
        || l.title.includes(query) || points.some(t => t.includes(query)) || (golden ?? '').includes(query)),
  })).filter(u => u.lessons.length > 0), [query]);
  const found = units.reduce((n, u) => n + u.lessons.length, 0);

  return (
    <m.main {...fade} style={{ maxWidth: WIDTH.read, margin: '0 auto', padding: 'var(--sp-6) var(--sp-5) var(--sp-9)' }}>
      <PageHeader crumbs={[<a key="a" href="#/" className="crumb-link">{t('crumb.academy', lang)}</a>, t('nav.reference', lang)]}
        title={t('nav.reference', lang)}
        lead={t('ref.lead', lang)} />
      <ContentLanguageNote />

      <section aria-labelledby="ref-rules" className="region">
        <SectionHeader id="ref-rules" title={t('ref.rules', lang)} count={found}
          description={t('ref.rulesdesc', lang)} />
        <div className="ref-search">
          <label htmlFor="ref-q" className="form-label">{t('ref.search', lang)}</label>
          <span className="ref-search-field">
            <Search size={16} aria-hidden />
            <input id="ref-q" type="search" className="field w-full" value={q} onChange={e => setQ(e.target.value)}
              placeholder={t('ref.placeholder', lang)} aria-describedby="ref-count" />
          </span>
          <p id="ref-count" className="t-sm c-tx2 m-0" aria-live="polite">{query ? tf('ref.found', { q: query, lessons: lessonCount(found, lang) }, lang) : ''}</p>
        </div>
        <div className="stack gap-6 mt-5">
          {units.map(({ mod, lessons }) => (
            <section key={mod.id} aria-labelledby={`ref-${mod.id}`} className="stack gap-3">
              <h3 id={`ref-${mod.id}`} className="t-h3 m-0"><Content>{mod.title}</Content></h3>
              {lessons.map(({ l, points, golden }) => (
                <details key={l.id} className="ref-lesson" open={!!query}>
                  <summary>
                    <span className="t-title"><Content>{l.title}</Content></span>
                    {!p.lessons[l.id] && <span className="t-label c-tx3"> · {t('ref.notyet', lang)}</span>}
                  </summary>
                  <ArabicContent as="div">
                    <ul className="pa-list">
                      {points.map((pt, i) => <li key={i} className="t-sm c-tx1">{pt}</li>)}
                    </ul>
                  </ArabicContent>
                  {golden && <p className="t-sm c-tx0 mt-3 mb-0"><strong>{t('ref.golden', lang)}</strong> <Content>{golden}</Content></p>}
                </details>
              ))}
            </section>
          ))}
          {units.length === 0 && <p className="t-sm c-tx2">{tf('ref.none', { q: query }, lang)}</p>}
        </div>
      </section>

      <section aria-labelledby="ref-journey" className="region">
        <SectionHeader id="ref-journey" title={t('ref.journey', lang)} count={JOURNEY_STAGES.length}
          description={t('ref.journeydesc', lang)} />
        <ol className="ref-journey stack m-0 gap-4">
          {JOURNEY_STAGES.map(st => {
            const o = OWNER[st.owner];
            const mine = st.owner === 'membership';
            return (
              <li key={st.n} className="ref-stage" data-mine={mine || undefined}>
                <span aria-hidden className="ref-stage-n t-num">{st.n}</span>
                <div className="grow">
                  <div className="row items-center gap-3 wrap">
                    <h3 className="t-h3 m-0"><Content>{st.title}</Content></h3>
                    <StatusBadge tone={o.tone} icon={o.icon}>{t(o.label, lang)}</StatusBadge>
                  </div>
                  <ArabicContent as="div">
                    <p className="t-label mt-2 mb-0">{st.department}</p>
                    <ul className="pa-list">
                      {st.points.map((pt, pi) => <li key={pi} className="t-sm">{pt}</li>)}
                    </ul>
                    {st.note && <p className="t-label mt-3 mb-0 c-tx2">{st.note}</p>}
                  </ArabicContent>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </m.main>
  );
};

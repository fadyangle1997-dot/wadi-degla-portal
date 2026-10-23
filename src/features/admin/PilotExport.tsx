/**
 * The pilot's Academy-side data (domain/analytics/pilot), for the people who
 * compare it with the club's own records (docs/pilot-measurement.md): one row
 * per trainee — start, certification, days between, unit decisions, and the
 * trainer's and manager's recorded actions. Counts, never a score.
 */
import React, { useMemo, useState } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { useOrganization } from '../../app/organization/orgStore';
import { trainingStore, useTraining } from '../../app/training/trainingStore';
import { storedProgressEventsOf } from '../../app/backend';
import { isProgramComplete } from '../../domain/journey/programCompletion';
import { pilotRow, pilotSummary, pilotCsv } from '../../domain/analytics/pilot';
import { branchNameOf } from '../../domain/organization';
import { usersWhoCan } from '../../domain/identity/scope';
import { Button, SectionHeader, Toast } from '../../ui/primitives';
import { useLang, t, tf, iso } from '../../app/i18n';
import { staffCount } from '../../app/plural';

export const PilotExport: React.FC = () => {
  const lang = useLang();
  const { users, roles } = useIdentity();
  const org = useOrganization();
  const tState = useTraining();
  const [toast, setToast] = useState<string | null>(null);
  // Learners by capability, not by role name (domain/identity/scope).
  const trainees = useMemo(() => usersWhoCan(users, roles, 'academy.learn').filter(u => u.status !== 'archived'), [users, roles]);
  const rows = useMemo(() => {
    const events = trainingStore.events();
    return trainees.map(u => {
      const first = storedProgressEventsOf(u.id).reduce<number | null>((m, e) => (m === null || e.at < m ? e.at : m), null);
      return pilotRow(events, u.id, first, isProgramComplete(tState, u.id));
    });
  }, [trainees, tState]);
  const s = pilotSummary(rows);

  const exportCsv = () => {
    const who = (id: string) => {
      const u = users.find(x => x.id === id);
      return { name: u?.name ?? id, branch: branchNameOf(u?.branchId, org.branches), trainer: users.find(x => x.id === u?.trainerId)?.name ?? '' };
    };
    const url = URL.createObjectURL(new Blob([pilotCsv(rows, who)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `pilot-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoked after the click has been handed to the browser.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast(t('ad.exported', lang));
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <section className="region" aria-labelledby="ad-pilot">
      <SectionHeader id="ad-pilot" title={t('pm.title', lang)} description={t('pm.sub', lang)}
        action={rows.length > 0 ? <Button variant="ghost" onClick={exportCsv}>{t('ad.exportcsv', lang)}</Button> : undefined} />
      <p className="t-sm c-tx1 m-0">
        {tf('pm.summary', {
          n: staffCount(s.people, lang), c: iso(s.certified),
          r: iso(s.rework.count), a: iso(s.rework.of),
          f: iso(s.firstTime.count), u: iso(s.firstTime.of),
        }, lang)}
      </p>
      <Toast message={toast} />
    </section>
  );
};

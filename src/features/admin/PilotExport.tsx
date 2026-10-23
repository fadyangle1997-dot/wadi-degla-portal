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
import { pilotRow, pilotSummary, pilotCsv, firstAt } from '../../domain/analytics/pilot';
import { groupByEmployee } from '../../domain/performance';
import { downloadCsv } from '../../lib/csv';
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
  // Each trainee's progress log is read once, not on every training change.
  const starts = useMemo(() => new Map(trainees.map(u => [u.id, firstAt(storedProgressEventsOf(u.id))])), [trainees]);
  const rows = useMemo(() => {
    const own = groupByEmployee(trainingStore.events());
    return trainees.map(u => pilotRow(own.get(u.id) ?? [], u.id, starts.get(u.id) ?? null, isProgramComplete(tState, u.id)));
  }, [trainees, starts, tState]);
  const s = pilotSummary(rows);

  const exportCsv = () => {
    const who = (id: string) => {
      const u = users.find(x => x.id === id);
      return { name: u?.name ?? id, branch: branchNameOf(u?.branchId, org.branches), trainer: users.find(x => x.id === u?.trainerId)?.name ?? '' };
    };
    downloadCsv('pilot', pilotCsv(rows, who));
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

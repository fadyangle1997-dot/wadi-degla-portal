/**
 * The branch manager's attention queue (domain/analytics/attention, D4): what
 * waits on them, what kind of thing it is, and the evidence it is there for.
 * One list instead of two briefs and a follow-up table; every row opens the
 * person's file, where the decision or the action is taken.
 */
import React, { useMemo } from 'react';
import { useIdentity } from '../../app/identity/identityStore';
import { useOrganization } from '../../app/organization/orgStore';
import { trainingStore, useTraining } from '../../app/training/trainingStore';
import { attentionQueue, type AttentionItem } from '../../domain/analytics/attention';
import type { OrgEvent } from '../../domain/analytics/organization';
import { EVALUATION_DIMENSIONS } from '../../domain/evaluation';
import { displayNameOf } from '../../domain/identity';
import { moduleById } from '../../content/registry';
import { issueText } from '../admin/issueText';
import { levelLabel, basisParams } from '../readiness/labels';
import { DataTable, SectionHeader, Status, EmptyState, ArabicContent, tx, type Column } from '../../ui/primitives';
import { tone, rowTone, type Semantic } from '../../ui/statusSemantics';
import { useLang, t as tr, tf, type Lang } from '../../app/i18n';
import { daysSince, dayCount, timesCount } from '../../app/plural';
import { CheckCircle2 } from 'lucide-react';

const SEMANTIC: Record<AttentionItem['kind'], Semantic> = {
  readiness_decision: 'pending',
  escalated_unit: 'pending',
  immediate_follow_up: 'risk',
  trainer_bottleneck: 'warning',
  data_problem: 'warning',
};

export const AttentionQueue: React.FC<{ ids: readonly string[]; onInspect: (id: string) => void }> = ({ ids, onInspect }) => {
  const lang = useLang();
  const t = useTraining();
  const { users } = useIdentity();
  const { branches } = useOrganization();
  const items = useMemo(
    () => attentionQueue(t, trainingStore.events() as readonly OrgEvent[], users, ids, Date.now()),
    [t, users, ids],
  );
  const nameOf = (id: string) => { const u = users.find(x => x.id === id); return u ? displayNameOf(u, lang) : id; };
  const unit = (id: string) => <ArabicContent as="span">{moduleById(id)?.title ?? id}</ArabicContent>;

  const why = (i: AttentionItem, l: Lang): React.ReactNode => {
    switch (i.kind) {
      case 'readiness_decision':
        return tf('aq.w.decision', basisParams(i.basis, l), l);
      case 'escalated_unit':
        return tx('aq.w.escalated', { m: <>{i.moduleIds.map((m, k) => <React.Fragment key={m}>{k > 0 && '، '}{unit(m)}</React.Fragment>)}</> }, l);
      case 'immediate_follow_up':
        return i.criticalAtLowest.length > 0
          ? tx('aq.w.critical', { k: <ArabicContent as="span">{i.criticalAtLowest.map(d => EVALUATION_DIMENSIONS[d]).join('، ')}</ArabicContent>, l: levelLabel(1, l) }, l)
          : tf('aq.w.sentback', { n: timesCount(i.sentBack, l) }, l);
      case 'trainer_bottleneck':
        return tx('aq.w.waiting', { m: unit(i.moduleId), trainer: <bdi>{i.trainerId ? nameOf(i.trainerId) : tr('mg.unassigned', l)}</bdi>, d: dayCount(i.days, l) }, l);
      case 'data_problem':
        return issueText(i.issue, users, branches, l).message;
    }
  };

  const columns: Column<AttentionItem>[] = [
    { id: 'who', header: tr('dt.employee', lang), cell: i => <span className="t-sm c-tx0" style={{ fontWeight: 500 }}>{nameOf(i.employeeId)}</span> },
    { id: 'what', header: tr('aq.col.what', lang), cell: i => <Status tone={tone(SEMANTIC[i.kind])}>{tr(`aq.k.${i.kind}`, lang)}</Status> },
    { id: 'why', header: tr('aq.col.why', lang), cell: i => <span className="t-sm c-tx1">{why(i, lang)}</span> },
    { id: 'since', header: tr('tn.col.waiting', lang), cell: i => i.since ? <span className="t-sm c-tx2">{daysSince(i.since, lang)}</span> : null },
  ];

  return (
    <section className="region" aria-labelledby="mg-attention">
      <SectionHeader id="mg-attention" title={tr(items.length ? 'aq.title' : 'aq.empty', lang)} count={items.length}
        description={items.length ? tr('aq.sub', lang) : undefined} />
      {items.length === 0 ? (
        <EmptyState icon={<CheckCircle2 />} title={tr('aq.empty', lang)} body={tr('aq.emptybody', lang)} headingLevel={3} />
      ) : (
        <DataTable caption={tr('aq.title', lang)} columns={columns} rows={items}
          rowKey={i => `${i.kind}:${i.employeeId}:${i.kind === 'trainer_bottleneck' ? i.moduleId : i.kind === 'data_problem' ? i.issue.id : ''}`}
          onOpen={i => onInspect(i.employeeId)} rowLabel={() => tr('mg.openthefile', lang)}
          rowTone={i => rowTone(SEMANTIC[i.kind])} />
      )}
    </section>
  );
};

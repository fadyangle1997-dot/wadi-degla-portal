/**
 * Rule renderers — the bridge between lesson points and the rules engine.
 * A lesson point tagged with a RuleRef automatically surfaces a LIVE worked
 * example computed by the engine — the number on screen can never drift from
 * the approved calculation. Financial renderers also trigger the mandatory
 * prices disclaimer. Data-driven: adding a renderer here lights it up in every
 * lesson that references the rule; no per-lesson hardcoding.
 */
import { Card } from '../../ui/primitives';
import React from 'react';
import { Sparkles } from 'lucide-react';
import {
  separationPenalty, renewalPenaltyWithinYear, renewalPenaltyAfterYear,
  childJoiningPenalty, CANCELLATION_POLICY, PRICES_DISCLAIMER,
} from '../../domain/rules';
import type { CalculationResult } from '../../domain/types/money';
import { Eyebrow, PricesNote } from '../../ui/primitives';

/* ---------- shared presentation ---------- */
const ExampleCard: React.FC<{ title: string; result: CalculationResult }> = ({ title, result }) => (
  <div className="example-card">
    <Eyebrow icon={<Sparkles size={13} />}>{title} — محسوب مباشرة من المحرك</Eyebrow>
    <p className="example-total">
      {result.total}<span className="t-sm c-tx2 ms-2">ج.م</span>
    </p>
    {result.lines.length > 0 && (
      <ul role="list" className="list-plain mb-2">
        {result.lines.map((l, i) => (
          <li key={i} className="t-sm row justify-between gap-3 py-1">
            <span>{l.label}{l.note ? ` (${l.note})` : ''}</span>
            <span className="t-num c-tx1">{l.amount}</span>
          </li>
        ))}
      </ul>
    )}
    <p className="t-sm measure">{result.explanation}</p>
  </div>
);

/* ---------- renderers per rule ---------- */
const SeparationExample: React.FC = () => (
  <ExampleCard title="مثال: ابن 28 سنة" result={separationPenalty({ age: 28 })} />
);
const RenewalWithinExample: React.FC = () => (
  <ExampleCard title="مثال: تأخير شهرين · 3 أعضاء · تجديد 1000/عضو"
    result={renewalPenaltyWithinYear({ renewalValuePerMember: 1000, memberCount: 3, currentMonth: 5 })} />
);
const RenewalAfterExample: React.FC = () => (
  <ExampleCard title="مثال: سنة كاملة بلا تجديد · قيمة سنتها 2000"
    result={renewalPenaltyAfterYear({ unrenewedYearRenewalValue: 2000, yearsUnrenewed: 1 })} />
);
const ChildJoiningExample: React.FC = () => (
  <ExampleCard title="مثال معتمد: مولود 2013 · إنشاء 2018 · إضافة 2026"
    result={childJoiningPenalty({ birthYear: 2013, membershipCreationYear: 2018, additionYear: 2026 })} />
);
const CancellationCard: React.FC = () => (
  <Card tone="raised" pad={5}>
    <Eyebrow>سياسة الإلغاء المعتمدة</Eyebrow>
    <p className="t-body mt-3 mb-2">
      بدون أسباب: أول <b className="t-num">{CANCELLATION_POLICY.noReasonWindowDays}</b> يوم من التعاقد.
    </p>
    <p className="t-sm">
      بعدها: {CANCELLATION_POLICY.afterWindow.acceptedReasons.join(' · ')} — بمستند رسمي. {CANCELLATION_POLICY.afterWindow.refundNote}
    </p>
  </Card>
);

const REGISTRY: Record<string, React.FC> = {
  'separation.penalty': SeparationExample,
  'renewal.withinYear': RenewalWithinExample,
  'renewal.afterYear': RenewalAfterExample,
  'childJoining.penalty': ChildJoiningExample,
  'cancellation.window': CancellationCard,
};
/** Rules whose renderers show money → mandatory disclaimer. */
const FINANCIAL = new Set(['separation.penalty', 'renewal.withinYear', 'renewal.afterYear', 'childJoining.penalty']);

/** Renders live examples for every distinct rule referenced by a lesson. */
export const RuleExamples: React.FC<{ rules: readonly string[] }> = ({ rules }) => {
  const distinct = [...new Set(rules)].filter(r => REGISTRY[r]);
  if (distinct.length === 0) return null;
  const financial = distinct.some(r => FINANCIAL.has(r));
  return (
    <div className="stack gap-3">
      {distinct.map(r => {
        const C = REGISTRY[r]!;
        return <C key={r} />;
      })}
      {financial && <PricesNote text={PRICES_DISCLAIMER} />}
    </div>
  );
};

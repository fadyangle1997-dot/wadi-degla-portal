/**
 * Rule governance metadata — Task 3 of Phase 1.5.
 * Every business rule can carry ownership/versioning WITHOUT touching the rule
 * functions themselves: metadata is keyed by the same RuleRef strings lessons
 * already use. Adding full governance later (approval workflow, effective
 * dates enforcement, admin editing) extends THIS map — zero rewrites.
 */

export interface RuleGovernance {
  readonly ruleId: string;          // same as RuleRef
  readonly version: number;
  readonly effectiveDate: string;   // ISO date the rule took effect
  readonly lastReviewed: string;
  readonly owner: string;           // accountable role
  readonly approvedBy: string;
  readonly changeHistory: readonly { readonly version: number; readonly date: string; readonly summary: string }[];
}

/** Seeded for the rules currently in the engine; grows with the engine. */
export const RULE_META: Readonly<Record<string, RuleGovernance>> = {
  'separation.penalty': {
    ruleId: 'separation.penalty', version: 1,
    effectiveDate: '2026-07-01', lastReviewed: '2026-07-09',
    owner: 'إدارة العضويات', approvedBy: 'مدير قسم العضويات',
    changeHistory: [{ version: 1, date: '2026-07-01', summary: 'اعتماد أولي: شرائح 0/50/100/200% + قاعدة 1997 وأقدم.' }],
  },
  'renewal.withinYear': {
    ruleId: 'renewal.withinYear', version: 1,
    effectiveDate: '2026-07-01', lastReviewed: '2026-07-09',
    owner: 'إدارة العضويات', approvedBy: 'مدير قسم العضويات',
    changeHistory: [{ version: 1, date: '2026-07-01', summary: 'اعتماد المرحلة الأولى: 5%/عضو/شهر بدون ضريبة.' }],
  },
  'renewal.afterYear': {
    ruleId: 'renewal.afterYear', version: 1,
    effectiveDate: '2026-07-01', lastReviewed: '2026-07-09',
    owner: 'إدارة العضويات', approvedBy: 'مدير قسم العضويات',
    changeHistory: [{ version: 1, date: '2026-07-01', summary: 'اعتماد الشرائح 50/100/200/300% من قيمة سنة عدم التجديد.' }],
  },
  'childJoining.penalty': {
    ruleId: 'childJoining.penalty', version: 1,
    effectiveDate: '2026-07-01', lastReviewed: '2026-07-09',
    owner: 'إدارة العضويات', approvedBy: 'مدير قسم العضويات',
    changeHistory: [{ version: 1, date: '2026-07-01', summary: 'اعتماد جدول تجديد التابع والمثال المرجعي 1342.' }],
  },
  'cancellation.window': {
    ruleId: 'cancellation.window', version: 1,
    effectiveDate: '2026-07-01', lastReviewed: '2026-07-09',
    owner: 'إدارة العضويات', approvedBy: 'مدير قسم العضويات',
    changeHistory: [{ version: 1, date: '2026-07-01', summary: 'اعتماد نافذة 30 يوم + الحالات الموثقة بعدها.' }],
  },
};

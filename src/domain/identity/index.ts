/**
 * Identity domain — RBAC core (ADR-002).
 * PERMISSIONS is the single catalogue of atomic capabilities; the Permission
 * type is DERIVED from it (a typo in a permission string is a compile error).
 * Roles are DATA (collections of permissions) — the org chart can change
 * without touching code, because code only ever asks `can(permission)`.
 */

/* ---------------- permissions (atomic, code-bound) ---------------- */
export const PERMISSIONS = {
  'users.view': 'عرض المستخدمين',
  'users.create': 'إنشاء مستخدم',
  'users.edit': 'تعديل بيانات مستخدم',
  'users.activate': 'تفعيل / تعطيل مستخدم',
  'users.archive': 'أرشفة مستخدم',
  'users.assignRole': 'تغيير دور مستخدم',
  'users.resetPassword': 'إعادة تعيين كلمة المرور',
  'assignments.trainer': 'إسناد مدرب لموظف',
  'assignments.manager': 'إسناد مدير لمدرب أو فرع',
  'academy.learn': 'دخول الأكاديمية كمتدرب',
  // Data scope (row-level authorization). Exactly one of these decides WHOSE
  // records an identity may see. Widest wins; absent = sees nothing.
  'scope.organization': 'رؤية بيانات المؤسسة كلها',
  'scope.area': 'رؤية بيانات عدة فروع في المنطقة',
  'scope.branch': 'رؤية بيانات الفرع المسند',
  'scope.assigned': 'رؤية المتدربين المسندين للمدرب',
  'scope.self': 'رؤية بياناته هو فقط',
  'academy.edit': 'تعديل محتوى الأكاديمية',
  'academy.publish': 'نشر محتوى الأكاديمية',
  'employees.view': 'عرض الموظفين وتقدمهم',
  'employees.edit': 'تعديل بيانات الموظفين',
  'training.review': 'مراجعة وتقييم التدريب',
  'reports.view': 'عرض التقارير',
  'readiness.decide': 'اتخاذ قرار الجاهزية النهائي',
  'feedback.observe': 'كتابة ملاحظة متابعة لا تعدّل قرارًا تشغيليًا',
  'reports.export': 'تصدير التقارير',
  'audit.view': 'عرض سجل التدقيق',
  'audit.export': 'تصدير سجل التدقيق',
  'operations.view': 'عرض الصحة التشغيلية',
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as readonly Permission[];

/* ---------------- roles (data, editable without code) ---------------- */
export interface Role {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly permissions: readonly Permission[];
}

export const DEFAULT_ROLES: readonly Role[] = [
  {
    id: 'admin',
    name: 'مسؤول النظام',
    description: 'إدارة المستخدمين والأدوار والإسنادات والمحتوى والتشغيل.',
    // Deliberately NOT all permissions: an administrator runs the system, it
    // does not train employees, review teams, or take the academy. Role
    // isolation is the product decision — and it matches the operating guide.
    permissions: [
      'users.view', 'users.create', 'users.edit', 'users.activate', 'users.archive',
      'users.assignRole', 'users.resetPassword',
      'assignments.trainer', 'assignments.manager',
      'academy.edit', 'academy.publish',
      'audit.view', 'audit.export',
      'operations.view',
      'scope.organization',
    ],
  },
  {
    id: 'manager',
    name: 'مدير فرع',
    description: 'متابعة مدربي وموظفي الفرع المسند إليه — وصاحب القرار التشغيلي الوحيد.',
    // The guide is explicit: «المدير سلطة الجاهزية التشغيلية — لا يُدرّس».
    // Reviewing training is the trainer's platform, not the manager's.
    // Branch scope: sees only the branch assigned to them.
    // AUTHORITY MODEL (frozen): the branch manager is the ONLY role that owns
    // an operational decision — readiness.decide lives here and nowhere above.
    permissions: ['employees.view', 'reports.view', 'reports.export', 'readiness.decide', 'scope.branch'],
  },
  {
    id: 'area_manager',
    name: 'مدير منطقة',
    description: 'متابعة عدة فروع وتحليلها ومقارنتها — رؤية بلا قرار.',
    // AUTHORITY MODEL (frozen): visibility flows UP, decisions flow DOWN.
    // The area manager sees every operational dossier across their branches,
    // compares branches/trainers/employees, and leaves feedback — but holds NO
    // readiness.decide. No decision Action is ever rendered for this role.
    permissions: ['employees.view', 'reports.view', 'reports.export', 'feedback.observe', 'scope.area'],
  },
  {
    id: 'general_manager',
    name: 'مدير عام',
    description: 'رؤية المؤسسة كلها للمتابعة والتحليل التنفيذي — رؤية بلا قرار.',
    // AUTHORITY MODEL (frozen): whole-organization visibility, zero operational
    // decisions. Executive observation and feedback only — no readiness.decide.
    permissions: ['employees.view', 'reports.view', 'reports.export', 'feedback.observe', 'scope.organization'],
  },
  {
    id: 'trainer',
    name: 'مدرب',
    description: 'متابعة موظفيه ومراجعة تدريبهم.',
    permissions: ['employees.view', 'training.review', 'scope.assigned'],
  },
  {
    id: 'employee',
    name: 'موظف',
    description: 'متدرب الأكاديمية — التجربة التعليمية فقط.',
    permissions: ['academy.learn', 'scope.self'],
  },
];

/* ---------------- user ---------------- */
export type UserStatus = 'active' | 'disabled' | 'archived';

export interface User {
  readonly id: string;
  readonly name: string;
  /**
   * The name as its owner writes it in another script — «Karim Samir» next to
   * «كريم سمير». Entered by a person, never transliterated by the platform;
   * absent, `name` is shown as written in every language.
   */
  readonly displayName?: Readonly<Partial<Record<'ar' | 'en', string>>>;
  readonly email?: string;
  readonly branchId?: string;
  readonly roleId: string;
  readonly status: UserStatus;
  /** For employees: the trainer responsible for them. */
  readonly trainerId?: string;
  /** For trainers (or branch scope later): the manager responsible. */
  readonly managerId?: string;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** The name to show in an interface language: the owner's own spelling, else as entered. */
export const displayNameOf = (u: Pick<User, 'name' | 'displayName'>, lang: 'ar' | 'en'): string =>
  u.displayName?.[lang]?.trim() || u.name;

/* ---------------- authorization (the ONLY question UI may ask) ---------------- */
/**
 * `can` is a pure function: a disabled or archived user can do NOTHING,
 * everyone else can do exactly what their role's permission set grants.
 * UI must never compare role ids/names — that path leads back to boolean hell.
 */
export function can(
  user: User | null,
  roles: readonly Role[],
  permission: Permission,
): boolean {
  if (!user || user.status !== 'active') return false;
  const role = roles.find(r => r.id === user.roleId);
  return !!role && role.permissions.includes(permission);
}

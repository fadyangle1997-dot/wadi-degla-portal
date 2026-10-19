// @vitest-environment jsdom
/**
 * Screen behaviour in the unit suite — the redesigned screens exercised the
 * way a person uses them: the ledger's search, sort and filters; the account
 * panel's validation and confirmations; the exam's retry through the gate;
 * the boss battle's case file; the debrief's missing answer; the dialogs'
 * Escape and focus. Playwright covers the same journeys in a real browser;
 * these keep the logic honest on every unit run.
 */
import React from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, within } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { DataTable, ConfirmDialog, FormField, type Column } from '../../ui/primitives';
import { AdminView } from '../admin/AdminView';
import { AdminPlatform } from '../admin/AdminPlatform';
import { ExamView } from '../exam/ExamView';
import { BossView } from '../boss/BossView';
import { DecisionReview } from '../review/DecisionReview';
import { ReadinessResult } from '../readiness/ReadinessResult';
import { readinessStanding } from '../../domain/readiness/track';
import { EMPTY_TRAINING } from '../../app/training/trainingBackend';
import { MODULES, BOSS_BATTLES } from '../../content/registry';
import { leaveGuard } from '../../app/leaveGuard';
import { textSizeStore } from '../../app/textSize';

beforeAll(() => {
  // jsdom has neither; the screens only use them for comfort (scrolling,
  // reduced-motion checks), never for behaviour under test.
  window.matchMedia ??= ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
  Element.prototype.scrollIntoView ??= function () {};
});
afterEach(cleanup);

/* ---------------- DataTable ---------------- */
interface P { id: string; name: string; score: number; ok: boolean }
const people: P[] = [
  { id: 'a', name: 'Omar', score: 40, ok: false },
  { id: 'b', name: 'Lina', score: 90, ok: true },
  { id: 'c', name: 'Adel', score: 70, ok: true },
];
const cols: Column<P>[] = [
  { id: 'name', header: 'Name', cell: r => r.name, sortValue: r => r.name },
  { id: 'score', header: 'Score', cell: r => `${r.score}%`, sortValue: r => r.score, align: 'end' },
];
const names = () => screen.getAllByRole('rowheader').map(c => c.textContent);

describe('DataTable — the ledger', () => {
  it('sorts by a column, and a second press reverses it', () => {
    render(<DataTable caption="People" columns={cols} rows={people} rowKey={r => r.id} initialSort={{ id: 'name', dir: 'asc' }} />);
    expect(names()).toEqual(['Adel', 'Lina', 'Omar']);
    fireEvent.click(screen.getByRole('button', { name: /Score/ }));
    expect(names()).toEqual(['Omar', 'Adel', 'Lina']);
    expect(screen.getByRole('columnheader', { name: /Score/ }).getAttribute('aria-sort')).toBe('ascending');
    fireEvent.click(screen.getByRole('button', { name: /Score/ }));
    expect(names()).toEqual(['Lina', 'Adel', 'Omar']);
  });

  it('searches, clears the search in place, and filters by one chip at a time', () => {
    const onOpen = vi.fn();
    render(<DataTable caption="People" columns={cols} rows={people} rowKey={r => r.id} onOpen={onOpen}
      search={{ placeholder: 'Find', match: (r, q) => r.name.toLowerCase().includes(q) }}
      filters={[{ id: 'ok', label: 'Ready', test: r => r.ok }]} />);
    expect(screen.getByRole('table', { name: 'People' })).toBeTruthy();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Find' }), { target: { value: 'li' } });
    expect(names()).toEqual(['Lina']);
    fireEvent.click(screen.getByRole('button', { name: 'امسح البحث' }));
    expect(names()).toHaveLength(3);

    const chip = screen.getByRole('button', { name: 'Ready' });
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-current')).toBe('true');
    expect(names().sort()).toEqual(['Adel', 'Lina']);
    fireEvent.click(chip); // the active chip takes itself off
    expect(names()).toHaveLength(3);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Find' }), { target: { value: 'zzz' } });
    expect(screen.getByText('مفيش نتايج بالبحث ده.')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'اعرض الكل' }));
    expect(names()).toHaveLength(3);

    fireEvent.click(screen.getByRole('button', { name: 'Omar' }));
    expect(onOpen).toHaveBeenCalledWith(people[0]);
  });

  it('shows its empty state when there is nothing at all', () => {
    render(<DataTable caption="People" columns={cols} rows={[]} rowKey={r => r.id} empty={<p>Nobody yet</p>} />);
    expect(screen.getByText('Nobody yet')).toBeTruthy();
  });
});

/* ---------------- dialogs and fields ---------------- */
describe('ConfirmDialog and FormField', () => {
  it('a destructive dialog starts on Cancel, and Escape cancels', () => {
    const onCancel = vi.fn(), onConfirm = vi.fn();
    render(<ConfirmDialog open title="Delete?" body="Gone for good." confirmLabel="Delete" danger onConfirm={onConfirm} onCancel={onCancel} />);
    expect(document.activeElement?.textContent).toBe('إلغاء');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('a field wires its error and hint to the control', () => {
    render(<FormField id="f" label="Name" required hint="As on the ID" error="Enter a name.">{p => <input {...p} />}</FormField>);
    const input = screen.getByLabelText('Name');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('f-err f-hint');
    expect(screen.getByText('Enter a name.')).toBeTruthy();
  });
});

/* ---------------- user administration ---------------- */
describe('AdminView — users', () => {
  beforeEach(() => { localStorage.clear(); identityStore.signIn('admin'); });

  it('opens an account from its row, refuses an empty name next to the field, and saves a real one', () => {
    render(<AdminView onExit={() => {}} />);
    const table = screen.getByRole('table', { name: 'المستخدمون' });
    fireEvent.click(within(table).getByRole('button', { name: /Nabil Sherif/ }));
    const panel = screen.getByRole('dialog', { name: 'Nabil Sherif' });
    const name = within(panel).getByLabelText(/^الاسم/);
    fireEvent.change(name, { target: { value: '' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'حفظ' }));
    expect(within(panel).getByText('اكتب الاسم.')).toBeTruthy();
    expect(document.activeElement).toBe(name);

    fireEvent.change(name, { target: { value: 'Nabil S.' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'حفظ' }));
    expect(identityStore.userById('manager.nabil')?.name).toBe('Nabil S.');
    identityStore.updateUser('manager.nabil', { name: 'Nabil Sherif' }); // the store is shared: put it back
  });

  it('asks before throwing away unsaved edits', () => {
    render(<AdminView onExit={() => {}} />);
    fireEvent.click(within(screen.getByRole('table', { name: 'المستخدمون' })).getByRole('button', { name: /Nabil Sherif/ }));
    const panel = screen.getByRole('dialog', { name: 'Nabil Sherif' });
    fireEvent.change(within(panel).getByLabelText(/^الاسم/), { target: { value: 'Someone else' } });
    fireEvent.click(within(panel).getByRole('button', { name: 'إغلاق' }));
    expect(screen.getByRole('dialog', { name: 'تسيب التعديلات من غير حفظ؟' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'سيبها' }));
    expect(screen.queryByRole('dialog', { name: 'Nabil Sherif' })).toBeNull();
    expect(identityStore.userById('manager.nabil')?.name).toBe('Nabil Sherif');
  });

  it('disables an account only after saying so, and never the admin\'s own', () => {
    render(<AdminView onExit={() => {}} />);
    const table = screen.getByRole('table', { name: 'المستخدمون' });
    fireEvent.click(within(table).getByRole('button', { name: /Nabil Sherif/ }));
    fireEvent.click(screen.getByRole('button', { name: 'تعطيل' }));
    const ask = screen.getByRole('dialog', { name: /تعطّل Nabil Sherif/ });
    expect(identityStore.userById('manager.nabil')?.status).toBe('active');
    fireEvent.click(within(ask).getByRole('button', { name: 'تعطيل' }));
    expect(identityStore.userById('manager.nabil')?.status).toBe('disabled');
    identityStore.setActive('manager.nabil', true);
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));

    fireEvent.click(within(table).getByRole('button', { name: /System Administrator/ }));
    const own = screen.getByRole('dialog', { name: 'System Administrator' });
    expect(within(own).queryByRole('button', { name: 'تعطيل' })).toBeNull();
    expect((within(own).getByRole('combobox', { name: 'الدور' }) as HTMLSelectElement).disabled).toBe(true);
  });

  it('creates a user only once the name and email are right', () => {
    render(<AdminView onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'إضافة مستخدم' }));
    const form = screen.getByRole('dialog', { name: 'مستخدم جديد' });
    fireEvent.click(within(form).getByRole('button', { name: 'إنشاء' }));
    expect(within(form).getByText('اكتب الاسم.')).toBeTruthy();
    fireEvent.change(within(form).getByLabelText(/^الاسم/), { target: { value: 'Salma Fawzy' } });
    fireEvent.change(within(form).getByLabelText(/^الإيميل/), { target: { value: 'salma@' } });
    fireEvent.click(within(form).getByRole('button', { name: 'إنشاء' }));
    expect(within(form).getByText(/الإيميل مش مكتوب صح/)).toBeTruthy();
    fireEvent.change(within(form).getByLabelText(/^الإيميل/), { target: { value: 'salma@example.com' } });
    fireEvent.click(within(form).getByRole('button', { name: 'إنشاء' }));
    expect(screen.queryByRole('dialog', { name: 'مستخدم جديد' })).toBeNull();
    expect(identityStore.get().users.some(u => u.name === 'Salma Fawzy' && u.email === 'salma@example.com')).toBe(true);
  });
});

describe('AdminPlatform — sections', () => {
  beforeEach(() => { localStorage.clear(); identityStore.signIn('admin'); });

  it('moves between its sections, and the audit log lists what was done', () => {
    identityStore.requestPasswordReset('manager.nabil');
    render(<AdminPlatform onExit={() => {}} />);
    for (const tab of ['الوارد', 'المنظمة', 'المستخدمون', 'سجل التدقيق']) {
      fireEvent.click(screen.getByRole('button', { name: tab }));
      expect(screen.getByRole('button', { name: tab }).getAttribute('aria-current')).toBe('page');
    }
    expect(within(screen.getByRole('table', { name: 'سجل التدقيق' })).getAllByText(/Nabil Sherif/).length).toBeGreaterThan(0);
  });

  it('names an empty area as empty, and creates a named one', () => {
    render(<AdminPlatform onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'المنظمة' }));
    fireEvent.click(screen.getByRole('button', { name: 'منطقة جديدة' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(screen.getByText('اكتب اسم المنطقة.')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/اسم المنطقة الجديدة/), { target: { value: 'Giza Area' } });
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(screen.getAllByText('Giza Area').length).toBeGreaterThan(0);
  });
});

/* ---------------- assessment ---------------- */
describe('ExamView and BossView — Assessment Mode', () => {
  // Answer whatever is on screen and move on, until the result appears.
  const answerAll = () => {
    for (let i = 0; i < 200; i++) {
      if (screen.queryByText('النتيجة')) break;
      const option = document.querySelector<HTMLButtonElement>('button.option-idle:not(:disabled)');
      if (option) { fireEvent.click(option); continue; }
      const next = [...document.querySelectorAll<HTMLButtonElement>('main button.btn')].pop();
      if (!next) break;
      fireEvent.click(next);
    }
  };

  it('an exam asks before leaving mid-attempt, records once on finish, and retries through the shell', () => {
    const m = MODULES[0]!;
    const onFinish = vi.fn(), onRetry = vi.fn(), onExit = vi.fn();
    render(<ExamView module={m} onExit={onExit} onFinish={onFinish} onRetry={onRetry} />);
    expect(screen.getByText(`سؤال 1 من ${m.unitExam.length}`)).toBeTruthy();
    fireEvent.click(document.querySelector('button.option-idle')!);
    expect(leaveGuard.active()).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: /خروج/ }));
    expect(screen.getByRole('dialog', { name: 'تخرج من الامتحان؟' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'كمّل' }));
    expect(onExit).not.toHaveBeenCalled();

    answerAll();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(screen.getByText('النتيجة')).toBeTruthy();
    const retry = screen.queryByRole('button', { name: /حاول تاني/ });
    if (retry) { fireEvent.click(retry); expect(onRetry).toHaveBeenCalledOnce(); }
  });

  it('a boss battle opens as a case file and ends with its result', () => {
    const b = BOSS_BATTLES[0]!;
    const onFinish = vi.fn();
    render(<BossView battle={b} onExit={() => {}} onFinish={onFinish} />);
    expect(screen.getByText('الموقف')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ابدأ التحدّي/ }));
    expect(screen.getByText(`القرار 1 من ${b.steps.length}`)).toBeTruthy();
    answerAll();
    expect(onFinish).toHaveBeenCalledOnce();
    expect(screen.getByText('النتيجة')).toBeTruthy();
  });
});

/* ---------------- the daily debrief and readiness ---------------- */
describe('DecisionReview and ReadinessResult', () => {
  beforeEach(() => { localStorage.clear(); identityStore.signIn('ahmed.m'); });

  it('the debrief says an empty answer is empty, and steps back with «السابق»', () => {
    render(<DecisionReview onExit={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /كمّل/ }));
    expect(screen.getByText(/اكتب إجابتك الأول/)).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'عضو جه بصورة البطاقة' } });
    fireEvent.click(screen.getByRole('button', { name: /كمّل/ }));
    expect(screen.getByRole('button', { name: /السابق/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /السابق/ }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('عضو جه بصورة البطاقة');
  });

  it('readiness before the phase opens says the assessment has not started — not «not ready»', () => {
    const standing = readinessStanding(EMPTY_TRAINING, [], 'ahmed.m', true);
    render(<ReadinessResult standing={standing} onExit={() => {}} />);
    expect(screen.getByText('التقييم بيبدأ بعد اعتماد كل الوحدات')).toBeTruthy();
    expect(screen.queryByText('مش جاهز للعمل المستقل دلوقتي')).toBeNull();
    expect(screen.getByRole('list', { name: 'المحطات الست' })).toBeTruthy();
  });
});

describe('text size', () => {
  it('moves the root, and is kept', () => {
    textSizeStore.set('xl');
    expect(document.documentElement.dataset.text).toBe('xl');
    expect(localStorage.getItem('wda.text.v1')).toBe('xl');
    textSizeStore.set('md');
    expect(document.documentElement.dataset.text).toBeUndefined();
  });
});

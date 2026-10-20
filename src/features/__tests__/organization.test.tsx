// @vitest-environment jsdom
/**
 * An organisation assignment changes who sees what, so it is never committed
 * by touching a select. Picking stages the change and says what it will do;
 * Save commits it and says what it did — by name — and Cancel undoes the pick.
 * While anything is staged, leaving asks first.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { OrganizationPanel } from '../admin/OrganizationPanel';
import { orgStore } from '../../app/organization/orgStore';
import { identityStore } from '../../app/identity/identityStore';
import { leaveGuard } from '../../app/leaveGuard';
import { langStore } from '../../app/i18n';

beforeEach(() => { localStorage.clear(); identityStore.signIn('admin'); orgStore.reset(); langStore.set('ar'); });
afterEach(cleanup);

const areaOf = (branchId: string) => orgStore.get().branches.find(b => b.id === branchId)!.areaId;

describe('OrganizationPanel — staged assignments', () => {
  it('picking a new area stages it: nothing is saved, and the row says what will change', () => {
    render(<OrganizationPanel />);
    const select = screen.getByRole('combobox', { name: 'منطقة فرع Maadi' });
    fireEvent.change(select, { target: { value: 'cairo-2' } });
    expect(areaOf('maadi')).toBe('cairo-1');
    expect(orgStore.auditLog()).toEqual([]);
    const pending = screen.getByText('فرع Maadi هيتنقل من Cairo Area 1 إلى Cairo Area 2.');
    // The sentence is tied to the field, so it is heard with it.
    expect(select.getAttribute('aria-describedby')).toBe(pending.id);
    expect(leaveGuard.active()).toBe(true);
  });

  it('Save commits it and names the change; nothing generic', () => {
    render(<OrganizationPanel />);
    fireEvent.change(screen.getByRole('combobox', { name: 'منطقة فرع Maadi' }), { target: { value: 'cairo-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'احفظ' }));
    expect(areaOf('maadi')).toBe('cairo-2');
    expect(screen.getByRole('status').textContent).toContain('تم نقل فرع Maadi إلى Cairo Area 2');
    expect(screen.queryByText(/^اتحفظ$/)).toBeNull();
    expect(orgStore.auditLog().map(e => e.action)).toEqual(['org.branch_moved']);
    expect(leaveGuard.active()).toBe(false);
  });

  it('Cancel, or picking the saved value again, undoes the pick', () => {
    render(<OrganizationPanel />);
    const select = screen.getByRole<HTMLSelectElement>('combobox', { name: 'منطقة فرع Maadi' });
    fireEvent.change(select, { target: { value: 'cairo-2' } });
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(select.value).toBe('cairo-1');
    fireEvent.change(select, { target: { value: 'cairo-2' } });
    fireEvent.change(select, { target: { value: 'cairo-1' } });
    expect(screen.queryByText('مش محفوظ لسه:')).toBeNull();
    expect(leaveGuard.active()).toBe(false);
    expect(areaOf('maadi')).toBe('cairo-1');
  });

  it('an area manager change is staged and named the same way', () => {
    render(<OrganizationPanel />);
    fireEvent.change(screen.getByRole('combobox', { name: 'مدير منطقة Cairo Area 2' }), { target: { value: 'area.hoda' } });
    expect(orgStore.get().areas.find(a => a.id === 'cairo-2')!.managerId).toBeNull();
    const who = identityStore.userById('area.hoda')!.name;
    expect(screen.getByText(`${who} هيتولّى إدارة Cairo Area 2.`)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'احفظ' }));
    expect(screen.getByRole('status').textContent).toContain(`تم تعيين ${who} لإدارة Cairo Area 2`);
  });

  it('restoring an archived area asks first, like archiving', () => {
    orgStore.setAreaStatus('delta', 'inactive');
    render(<OrganizationPanel />);
    fireEvent.click(screen.getByRole('button', { name: /استرجاع/ }));
    expect(orgStore.get().areas.find(a => a.id === 'delta')!.status).toBe('inactive');
    expect(screen.getByRole('dialog', { name: 'تسترجع Delta Area؟' })).toBeTruthy();
  });
});

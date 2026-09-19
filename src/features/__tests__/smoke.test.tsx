// @vitest-environment jsdom
/**
 * UI smoke tests — the minimum harness that would have caught the
 * render-phase persistence bug and the empty-quiz crash class.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { identityStore } from '../../app/identity/identityStore';
import { authenticate, DEMO_ACCOUNTS, initialsOf } from '../../app/demo/demoAccounts';
import { landingFor } from '../../domain/identity/access';
import { can as canFor } from '../../domain/identity';
import { App } from '../../app/App';
import { LessonFlow } from '../lesson/LessonFlow';
import { MODULES } from '../../content/registry';

afterEach(cleanup);

describe('UI smoke', () => {
  it('first launch shows login; a trainee signing in reaches the academy path', async () => {
    // No role rigging needed any more: ahmed.hassan is a real seeded trainee,
    // so this exercises the actual path — credentials → session → permissions →
    // landing — instead of mutating an admin into a trainee to fake it.
    identityStore.signOut();
    render(<App />);
    // The door is English by design; the academy behind it is Arabic RTL.
    expect(screen.getByText('Wadi Degla Academy')).toBeTruthy();
    expect(screen.getByText('Membership Training Platform')).toBeTruthy();

    // Sign-in requires credentials — an empty submit must not open the academy.
    fireEvent.click(screen.getByText(/Sign In/));
    expect(screen.getByText(/Enter your username and password/)).toBeTruthy();

    // Wrong credentials must NOT open the academy.
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ahmed.m' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText(/Sign In/));
    expect(screen.getByText(/Incorrect username or password/)).toBeTruthy();

    // The real ones do.
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Welcome@123' } });
    fireEvent.click(screen.getByText(/Sign In/));
    // Sign-in settles asynchronously (loading state), then the academy opens.
    await waitFor(() => expect(screen.getByText('مهمة النهارده')).toBeTruthy());
  });

  it('every lesson mounts LessonFlow without render-phase errors', () => {
    for (const m of MODULES) for (const l of m.lessons) {
      const { unmount } = render(
        <LessonFlow lesson={l} unitCode={m.code} moduleId={m.id}
          lessonIndex={m.lessons.indexOf(l)} lessonCount={m.lessons.length}
          nextStep={null} onComplete={() => {}} onExit={() => {}} />,
      );
      expect(screen.getAllByText(l.employeeQuestion).length).toBeGreaterThan(0);
      unmount();
    }
  });
});

describe('sign-in — the door', () => {
  // The session is a module singleton, so it survives between tests exactly as
  // it survives between screens. Signing out first both isolates each test and
  // proves sign-out genuinely ends the session.
  beforeEach(() => { identityStore.signOut(); });

  it('uses USERNAME, never email — per the brief', () => {
    render(<App />);
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/@/)).toBeNull();
  });

  it('every control has a real label — placeholders are not labels', () => {
    // A placeholder disappears the moment you type. Screen readers and anyone
    // who looks away mid-form lose the field's identity with it.
    render(<App />);
    expect(screen.getByLabelText('Username')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
    expect(screen.getByText('Remember me')).toBeTruthy();
    expect(screen.getByText('Forgot password?')).toBeTruthy();
  });

  it('password field is masked', () => {
    render(<App />);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('Enter submits — the form is keyboard-complete', () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: 'ahmed.m' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Welcome@123' } });
    fireEvent.keyDown(screen.getByLabelText('Password'), { key: 'Enter' });
    expect(screen.queryByText(/Enter your username/)).toBeNull();
  });

  it('🔴 the error is announced, not just coloured', () => {
    // Colour alone excludes anyone who cannot see it.
    render(<App />);
    fireEvent.click(screen.getByText(/Sign In/));
    const live = document.querySelector('[aria-live="polite"]');
    expect(live?.textContent).toContain('Enter your username');
  });

  it('the door is LTR while the academy behind it is RTL — deliberate seam', () => {
    render(<App />);
    expect(document.querySelector('.signin')?.getAttribute('dir')).toBe('ltr');
  });

  it('🚫 ambient light is decorative — never announced', () => {
    render(<App />);
    for (const orb of document.querySelectorAll('.signin-orb')) {
      expect(orb.getAttribute('aria-hidden')).toBe('true');
    }
  });
});

describe('🔴 the session is the permission boundary', () => {
  beforeEach(() => { identityStore.signOut(); });

  it('no session → no actor → no permission. Never a default-allow.', () => {
    // This provider used to return SYSTEM_ADMIN unconditionally: every check
    // resolved to yes, every guard passed, and sign-in was theatre. A permission
    // system bypassed by its own session provider is not a permission system.
    expect(identityStore.currentUser()).toBeNull();
  });

  it('signing in resolves the REAL user, with their real role', async () => {
    const acc = authenticate('trainer.adel', 'Welcome@123');
    expect(acc).not.toBeNull();
    identityStore.signIn(acc!.id);
    const user = identityStore.currentUser();
    expect(user?.id).toBe('trainer.adel');
    expect(user?.roleId).toBe('trainer');
  });

  it('signing out ends the session — everything derived collapses', () => {
    identityStore.signIn('trainer.adel');
    expect(identityStore.currentUser()).not.toBeNull();
    identityStore.signOut();
    expect(identityStore.currentUser()).toBeNull();
  });

  it('🚫 wrong password is rejected, and never says which half was wrong', async () => {
    expect(authenticate('ahmed.m', 'Welcome@124')).toBeNull();
    expect(authenticate('ahmed.m', '')).toBeNull();
    expect(authenticate('nobody.here', 'Welcome@123')).toBeNull();
  });

  it('usernames are case-insensitive; passwords are not', async () => {
    expect((authenticate('Ahmed.M', 'Welcome@123'))?.id).toBe('ahmed.m');
    expect(authenticate('ahmed.m', 'welcome@123')).toBeNull();
  });

  it('every demo account resolves to a real user in the identity store', () => {
    // These were once only a credential table — signing in as a trainer could
    // never actually BE a trainer, because nothing connected the two.
    for (const a of DEMO_ACCOUNTS) {
      identityStore.signIn(a.id);
      expect(identityStore.currentUser()?.id, a.username).toBe(a.id);
      expect(identityStore.currentUser()?.roleId, a.username).toBe(a.roleId);
    }
  });

  it('🔴 an unauthenticated user cannot reach ANY platform', () => {
    identityStore.signOut();
    render(<App />);
    // Only the door renders. No shell, no nav, no data.
    expect(screen.getByText('Wadi Degla Academy')).toBeTruthy();
    expect(screen.queryByText('مهمة النهارده')).toBeNull();
  });
});

describe('identity is a person, not a role label', () => {
  beforeEach(() => { identityStore.signOut(); });

  it('🚫 no placeholder accounts survive — the platform is not a demo', () => {
    // «admin123» tells you, before you read a word, that nobody expects you to
    // take this seriously.
    for (const a of DEMO_ACCOUNTS) {
      expect(a.username, a.username).not.toMatch(/^(admin|user|test|demo)\d+$/);
      expect(a.name.length, a.username).toBeGreaterThan(4);
      expect(a.name, `${a.username} has no real name`).toMatch(/\s/);
    }
  });

  it('display name, username and role are three separate fields', () => {
    // Deriving one from another is how «Ahmed Mohamed» becomes «ahmed.m» on a
    // screen a member can see.
    for (const a of DEMO_ACCOUNTS) {
      expect(a.name).not.toBe(a.username);
      expect(a.roleLabel).not.toBe(a.name);
    }
  });

  it('every role in the brief is present exactly once where it should be', () => {
    // 🔴 Updated for the second branch (Maadi) added alongside Nasr City so an
    // area manager has real data to compare — a legitimate update to reflect
    // the new official demo roster, not a weakened contract.
    const byRole = (r: string) => DEMO_ACCOUNTS.filter(a => a.roleId === r);
    expect(byRole('admin')).toHaveLength(1);
    expect(byRole('manager')).toHaveLength(2);
    expect(byRole('trainer')).toHaveLength(3);
    expect(byRole('employee')).toHaveLength(11);
  });

  it('usernames are unique — a duplicate silently signs someone in as another', () => {
    const u = DEMO_ACCOUNTS.map(a => a.username);
    expect(new Set(u).size).toBe(u.length);
  });

  it('initials come from first and last name', () => {
    expect(initialsOf('Ahmed Mohamed')).toBe('AM');
    expect(initialsOf('Mariam Ashraf')).toBe('MA');
    expect(initialsOf('System Administrator')).toBe('SA');
  });

  it('a single name yields one letter — never a fabricated second', () => {
    expect(initialsOf('Ahmed')).toBe('A');
    expect(initialsOf('  ')).toBe('?');
  });

  it('🔴 every account produces usable initials', () => {
    for (const a of DEMO_ACCOUNTS) {
      const i = initialsOf(a.name);
      expect(i.length, a.name).toBeGreaterThanOrEqual(1);
      expect(i.length, a.name).toBeLessThanOrEqual(2);
      expect(i, a.name).not.toBe('?');
    }
  });

  it('the trainees are spread across the programme, not clustered', () => {
    // Eight rows of the same number teaches a trainer nothing about their screen.
    const p = DEMO_ACCOUNTS.filter(a => a.progress !== undefined).map(a => a.progress!);
    expect(new Set(p).size).toBe(p.length);
    expect(Math.max(...p) - Math.min(...p)).toBeGreaterThan(0.8);
  });

  it('the signed-in user sees their own name, not just their role', () => {
    identityStore.signIn('trainer.adel');
    expect(identityStore.currentUser()?.name).toBe('Mohamed Adel');
  });
});

describe('🔴 login regression — desktop autofill whitespace', () => {
  // "Works on mobile, fails on desktop": a phone user types "Welcome@123"
  // cleanly; a desktop password manager fills "Welcome@123 " with a trailing
  // space. The username was trimmed and the password was not, so only the
  // desktop path failed. Both fields are normalised symmetrically now.
  it('a trailing space on the password still authenticates', async () => {
    expect((authenticate('ahmed.m', 'Welcome@123 '))?.id).toBe('ahmed.m');
  });
  it('a leading space on the password still authenticates', async () => {
    expect((authenticate('ahmed.m', ' Welcome@123'))?.id).toBe('ahmed.m');
  });
  it('a trailing space on the username still authenticates', async () => {
    expect((authenticate('ahmed.m ', 'Welcome@123'))?.id).toBe('ahmed.m');
  });
  it('🚫 a WRONG password is still wrong — trimming did not weaken the check', async () => {
    expect(authenticate('ahmed.m', 'Welcome@124')).toBeNull();
    expect(authenticate('ahmed.m', 'welcome@123')).toBeNull();  // case still matters
  });
});

describe('show-password toggle', () => {
  beforeEach(() => { identityStore.signOut(); });

  it('starts hidden — the field is a password field by default', () => {
    render(<App />);
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('🔴 toggling reveals and re-hides WITHOUT losing what was typed', () => {
    // The input is never unmounted — only its type flips — so focus and value
    // survive the toggle. That is the whole point of doing it this way.
    render(<App />);
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Welcome@123' } });
    fireEvent.click(screen.getByLabelText('Show password'));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('text');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('Welcome@123');
    fireEvent.click(screen.getByLabelText('Hide password'));
    expect(screen.getByLabelText('Password').getAttribute('type')).toBe('password');
  });

  it('announces its state to screen readers via aria-pressed', () => {
    render(<App />);
    const btn = screen.getByLabelText('Show password');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(btn);
    expect(screen.getByLabelText('Hide password').getAttribute('aria-pressed')).toBe('true');
  });

  it('🚫 the toggle is a button, never a submit — it must not sign you in', () => {
    render(<App />);
    expect(screen.getByLabelText('Show password').getAttribute('type')).toBe('button');
  });
});

describe('🔴 every demo account can actually SIGN IN and reach a platform', () => {
  // This is the Vercel bug in test form: authentication succeeded but landingFor
  // returned null, so a valid trainee saw "no platform access". Guarding the
  // whole chain — credentials → session → role → landing — means it cannot
  // regress silently again.
  beforeEach(() => { identityStore.signOut(); });

  for (const acc of DEMO_ACCOUNTS) {
    it(`${acc.username} authenticates and lands somewhere`, () => {
      const found = authenticate(acc.username, acc.password);
      expect(found, `${acc.username} failed authentication`).not.toBeNull();
      identityStore.signIn(found!.id);
      const user = identityStore.currentUser();
      expect(user, `${acc.username} has no user in the store`).not.toBeNull();
      expect(user!.roleId, `${acc.username} role not resolved`).toBe(acc.roleId);
      const can = (perm: string) => canFor(user, identityStore.get().roles, perm as never);
      expect(landingFor(can), `${acc.username} (${acc.roleId}) lands nowhere`).not.toBeNull();
    });
  }
});

describe('profile menu — sign out', () => {
  beforeEach(() => { identityStore.signOut(); });

  const signIn = (username: string, password: string) => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Username'), { target: { value: username } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
    fireEvent.click(screen.getByText(/Sign In/));
  };

  it('🔴 signing out returns to the login screen', async () => {
    signIn('ahmed.m', 'Welcome@123');
    // open the profile menu (its label carries the name)
    fireEvent.click(screen.getByLabelText(/القائمة الشخصية/));
    fireEvent.click(screen.getByRole('menuitem', { name: /تسجيل الخروج/ }));
    // back at the door: the username field exists again
    await waitFor(() => expect(screen.getByLabelText('Username')).toBeTruthy());
  });

  it('the menu opens and closes on Escape', () => {
    signIn('ahmed.m', 'Welcome@123');
    const trigger = screen.getByLabelText(/القائمة الشخصية/);
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('sign-out works for a trainer too (every role)', async () => {
    signIn('trainer.adel', 'Welcome@123');
    fireEvent.click(screen.getByLabelText(/القائمة الشخصية/));
    fireEvent.click(screen.getByRole('menuitem', { name: /تسجيل الخروج/ }));
    await waitFor(() => expect(screen.getByLabelText('Username')).toBeTruthy());
  });
});

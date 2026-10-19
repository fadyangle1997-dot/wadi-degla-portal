/**
 * Sign-in — the first impression.
 *
 * This screen has one job before a single word is read: say «premium club»,
 * not «admin console». Everything else in the academy is a working surface;
 * this is the door.
 *
 * ── DESIGN NOTES ─────────────────────────────────────────────────────────
 * • The reference's floating spheres are rebuilt as what they actually are
 *   here — club lighting behind glass. Warm, slow, and deliberately behind the
 *   card: ambient light frames a form, it never competes with it.
 * • Glass over a warm surface (#34312F) rather than the app's cool near-black,
 *   with an opaque-enough base so the card still reads where backdrop-filter
 *   is unsupported.
 * • Underline fields, not boxes. Boxes are forms; underlines are stationery —
 *   and there are only two of them, so the structure is obvious without chrome.
 * • The gold is the academy's existing gold family. This is one identity lit
 *   differently, not a second design language.
 *
 * ── LANGUAGE ─────────────────────────────────────────────────────────────
 * English, and `dir="ltr"`, per the brief. The academy behind this door is
 * Arabic RTL — the seam is deliberate, and the screen is scoped so nothing
 * about the RTL app changes.
 *
 * ── ACCESSIBILITY ────────────────────────────────────────────────────────
 * Real <label for> (not placeholders as labels), 44px+ targets, visible
 * focus rings on every control, Enter submits, errors announced via
 * aria-live, and ambient motion drops entirely under prefers-reduced-motion.
 */
import React, { useState } from 'react';
import { Loader2, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { BrandLogo } from '../../ui/BrandLogo';

/** Returns an error message, or null when the credentials are accepted. */
/** Returns an error message, or null when the credentials are accepted. */
interface Props { onSignIn: (username: string, password: string) => string | null }

export const LoginView: React.FC<Props> = ({ onSignIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    if (busy) return;
    if (!username.trim() || !password.trim()) {
      setError('Enter your username and password to continue.');
      return;
    }
    setError('');
    setBusy(true);
    // The door decides nothing about WHERE you go — it only decides whether it
    // opens. Routing is derived from permissions, one layer up.
    const failure = onSignIn(username.trim(), password);
    if (failure) { setError(failure); setBusy(false); }
  };

  return (
    <div
      className="signin"
      /* The mirror of the Arabic island: this screen is English and LTR in
         BOTH modes by design, so it declares both — `lang` beside `dir`, or a
         screen reader in Arabic mode announces «Sign In» with Arabic phonetics.
         Semantics only: not one pixel of this screen moves. */
      lang="en"
      dir="ltr"
      onKeyDown={e => { if (e.key === 'Enter') submit(); }}
      style={{
        position: 'relative', minHeight: '100vh', overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'var(--sp-6) var(--sp-5)',
      }}
    >
      {/* Ambient club light — behind everything, never on the reading path. */}
      <span aria-hidden className="signin-orb" style={{ width: 340, height: 340, top: '-8%', left: '-10%', background: '#CCAB6C', animationDelay: '0s' }} />
      <span aria-hidden className="signin-orb" style={{ width: 260, height: 260, top: '18%', right: '-6%', background: '#B38922', animationDelay: '-9s', opacity: .38 }} />
      <span aria-hidden className="signin-orb" style={{ width: 300, height: 300, bottom: '-12%', right: '12%', background: '#FEDEA0', animationDelay: '-17s', opacity: .3 }} />

      {/* A CSS entrance, not Motion: the sign-in screen paints before the
          animation engine has loaded, so it must not start invisible. */}
      <main className="enter-rise"
        style={{ position: 'relative', width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      >
        <BrandLogo size={104} />

        <h1 style={{
          margin: 'var(--sp-6) 0 var(--sp-2)', textAlign: 'center',
          fontSize: 'clamp(1.5rem, 4vw, 1.85rem)', fontWeight: 600, letterSpacing: '-.015em',
          color: 'var(--sg-tx)', lineHeight: 1.25,
        }}>
          Wadi Degla Academy
        </h1>
        <p style={{
          margin: 0, textAlign: 'center', fontSize: '.78rem', fontWeight: 500,
          letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--sg-gold-soft)',
        }}>
          Membership Training Platform
        </p>

        <section
          className="signin-card"
          // --r-lg, the card radius: the sign-in card has its own colours but shares
          // the spatial scale.
          style={{ width: '100%', marginTop: 'var(--sp-7)', padding: 'var(--sp-7) var(--sp-6)', borderRadius: 'var(--r-lg)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            <div>
              <label htmlFor="signin-user" style={labelStyle}>Username</label>
              <input
                id="signin-user" className="signin-field" type="text" autoComplete="username"
                value={username} onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="your.username" autoFocus
              />
            </div>

            <div>
              <label htmlFor="signin-pass" style={labelStyle}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="signin-pass" className="signin-field" type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password} onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  style={{ paddingInlineEnd: 'var(--sp-6)' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  aria-controls="signin-pass"
                  className="signin-eye"
                  tabIndex={0}
                >
                  {showPassword ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', cursor: 'pointer', minHeight: 44, fontSize: '.84rem', color: 'var(--sg-tx-dim)' }}>
                <input
                  type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ width: 17, height: 17, accentColor: 'var(--sg-gold)', cursor: 'pointer' }}
                />
                Remember me
              </label>
              <button type="button" className="signin-link" onClick={() => setError('Contact your department administrator to reset your password.')}>
                Forgot password?
              </button>
            </div>

            {/* Announced, never a colour-only signal. */}
            <div aria-live="polite" style={{ minHeight: error ? 'auto' : 0 }}>
              {error && (
                <p style={{ margin: 0, fontSize: '.82rem', color: 'var(--sg-gold-light)', lineHeight: 1.6 }}>
                  {error}
                </p>
              )}
            </div>

            <button type="button" className="signin-btn" onClick={submit} disabled={busy} aria-busy={busy}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)' }}>
              {busy
                ? <><Loader2 size={16} className="spin" /> Signing in…</>
                : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </div>
        </section>

        <p style={{ marginTop: 'var(--sp-6)', textAlign: 'center', fontSize: '.75rem', color: 'var(--sg-tx-dim)', letterSpacing: '.02em' }}>
          Official Membership Operations Academy · Internal use only
        </p>

        {/* Development-only role switcher — statically dropped from prod builds. */}
        {import.meta.env.DEV && <DevPanel onFill={(u, p) => { setUsername(u); setPassword(p); setError(''); }} />}
      </main>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 'var(--sp-2)',
  fontSize: '.72rem', fontWeight: 500, letterSpacing: '.1em',
  textTransform: 'uppercase', color: 'var(--sg-tx-dim)',
};

/** DEV ONLY — fills a demo credential. Statically dropped from prod builds. */
const DevPanel: React.FC<{ onFill: (u: string, p: string) => void }> = ({ onFill }) => (
  <div style={{ marginTop: 'var(--sp-5)', display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', justifyContent: 'center' }}>
    {[
      ['ahmed.m', 'Welcome@123', 'trainee'],
      ['trainer.adel', 'Welcome@123', 'trainer'],
      ['manager.nabil', 'Welcome@123', 'manager'],
      ['admin', 'Admin@2026', 'admin'],
    ].map(([u, pw, label]) => (
      <button key={u} type="button" className="signin-link" onClick={() => onFill(u!, pw!)}
        style={{ fontSize: '.68rem', opacity: .45 }}>
        dev · {label}
      </button>
    ))}
  </div>
);

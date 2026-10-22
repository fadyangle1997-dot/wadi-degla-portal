/**
 * Sign-in — the door (v3 benchmark).
 *
 * Arabic first and unmistakably Wadi Degla: the crest, the academy's name set
 * in its own face (Alexandria) as the one brand moment, and a single panel
 * with two fields and one gold action. Nothing glows, nothing drifts, no
 * gradient, no uppercase English: a club's door is confident because it is
 * quiet. It is the way in, not a marketing page.
 *
 * ── LANGUAGE ─────────────────────────────────────────────────────────────
 * The door speaks the product language (Arabic unless the person chose
 * English, which the switch at the top offers). The document's lang and dir
 * follow the choice, so a screen reader voices the right language.
 *
 * ── ACCESSIBILITY ────────────────────────────────────────────────────────
 * Visible labels (never placeholders), username and current-password
 * autocomplete, Enter submits (a real form), a missing field is said under
 * that field and focus moves to it, a wrong password is announced politely,
 * the reveal toggle states its state, and every target is 44px or more.
 *
 * «Remember me» is not here: it never did anything (see the controls audit),
 * and a control that does nothing is a broken promise. Whether to build it
 * is an open product decision.
 */
import React, { useRef, useState } from 'react';
import { Loader2, Eye, EyeOff, X } from 'lucide-react';
import { BrandLogo } from '../../ui/BrandLogo';
import { useLang, langStore, t } from '../../app/i18n';

/** Returns an error message, or null when the credentials are accepted. */
interface Props { onSignIn: (username: string, password: string) => string | null }

type FieldErrors = { user?: string; pass?: string };

export const LoginView: React.FC<Props> = ({ onSignIn }) => {
  const lang = useLang();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const userRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const missing: FieldErrors = {
      user: username.trim() ? undefined : t('door.err.user', lang),
      pass: password ? undefined : t('door.err.pass', lang),
    };
    setFieldErrors(missing);
    setFailure('');
    // Focus goes to the first field that needs something; its description reads the reason.
    if (missing.user) { userRef.current?.focus(); return; }
    if (missing.pass) { passRef.current?.focus(); return; }
    setBusy(true);
    // The door decides only whether it opens. Where it opens onto is derived
    // from permissions, one layer up.
    const error = onSignIn(username.trim(), password);
    if (error) { setFailure(error); setBusy(false); }
  };

  const other = lang === 'ar' ? 'en' : 'ar';

  return (
    <div className="door">
      <header className="door-bar">
        <button type="button" className="pill" onClick={() => langStore.toggle()} aria-label={t('lang.aria', lang)}>
          <span lang={other}>{t('lang.switch', lang)}</span>
        </button>
      </header>

      <main className="door-main">
        <div className="door-brand">
          <BrandLogo size={88} />
          <h1 className="door-title">{t('brand.name', lang)}</h1>
          <p className="door-lead">{t('door.lead', lang)}</p>
        </div>

        <section className="door-panel" aria-labelledby="door-panel-title">
          <h2 id="door-panel-title" className="door-panel-title">{t('door.title', lang)}</h2>
          <form className="door-form" noValidate onSubmit={submit}>
            <DoorField id="signin-user" label={t('door.user', lang)} error={fieldErrors.user}>
              {p => (
                <input {...p} ref={userRef} className="field" type="text" dir="auto" autoComplete="username"
                  autoCapitalize="none" spellCheck={false} autoFocus value={username}
                  onChange={e => { setUsername(e.target.value); setFieldErrors(f => ({ ...f, user: undefined })); setFailure(''); }} />
              )}
            </DoorField>

            <DoorField id="signin-pass" label={t('door.pass', lang)} error={fieldErrors.pass}>
              {p => (
                <div className="door-secret">
                  {/* No dir="auto" here: the reveal button sits at the field's
                      inline end, so the field keeps the page's direction (a
                      Latin password flipped it to LTR and ran under the eye). */}
                  <input {...p} ref={passRef} className="field" type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password" value={password}
                    onChange={e => { setPassword(e.target.value); setFieldErrors(f => ({ ...f, pass: undefined })); setFailure(''); }} />
                  {/* The input is never replaced, only its type flips: what was
                      typed and the caret survive the toggle. */}
                  <button type="button" className="door-eye" onClick={() => setShowPassword(v => !v)}
                    aria-label={t(showPassword ? 'door.hide' : 'door.show', lang)} aria-pressed={showPassword}
                    aria-controls="signin-pass">
                    {showPassword ? <EyeOff size={22} aria-hidden /> : <Eye size={22} aria-hidden />}
                  </button>
                </div>
              )}
            </DoorField>

            <button type="button" className="text-action door-help" aria-expanded={helpOpen} aria-controls="door-help"
              onClick={() => setHelpOpen(v => !v)}>
              {t('door.forgot', lang)}
            </button>
            {helpOpen && <p id="door-help" className="door-note">{t('door.forgothelp', lang)}</p>}

            {/* A wrong password belongs to no single field: it is announced here. */}
            <div aria-live="polite" className="door-live">
              {failure && <p className="door-alert">{failure}</p>}
            </div>

            <button type="submit" className="btn btn-primary door-submit" disabled={busy} aria-busy={busy}>
              {busy ? <><Loader2 size={16} className="spin" aria-hidden /> {t('door.busy', lang)}</> : t('door.submit', lang)}
            </button>
          </form>
        </section>

        {/* Development-only role switcher — statically dropped from prod builds. */}
        {import.meta.env.DEV && <DevPanel onFill={(u, p) => { setUsername(u); setPassword(p); setFieldErrors({}); setFailure(''); }} />}
      </main>

      <footer className="door-foot">{t('door.foot', lang)}</footer>
    </div>
  );
};

/**
 * A field on the door: the same contract as the shared FormField (visible
 * label, error under the field tied by aria-describedby, aria-invalid,
 * aria-required), written here so the first screen does not download the
 * whole primitives module before anyone has signed in.
 */
type DoorControl = { id: string; 'aria-invalid'?: true; 'aria-describedby'?: string; 'aria-required': true };
const DoorField: React.FC<{ id: string; label: string; error?: string; children: (p: DoorControl) => React.ReactNode }> = ({ id, label, error, children }) => (
  <div className="form-field">
    <label htmlFor={id} className="form-label">{label}</label>
    {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': error ? `${id}-err` : undefined, 'aria-required': true })}
    {error && <p id={`${id}-err`} className="form-error"><X size={13} aria-hidden /> {error}</p>}
  </div>
);

/** DEV ONLY — fills a demo credential. Statically dropped from prod builds. */
const DevPanel: React.FC<{ onFill: (u: string, p: string) => void }> = ({ onFill }) => (
  <div className="row gap-3 wrap justify-center" lang="en" dir="ltr">
    {[
      ['ahmed.m', 'Welcome@123', 'trainee'],
      ['trainer.adel', 'Welcome@123', 'trainer'],
      ['manager.nabil', 'Welcome@123', 'manager'],
      ['admin', 'Admin@2026', 'admin'],
    ].map(([u, pw, label]) => (
      <button key={u} type="button" className="text-action" onClick={() => onFill(u!, pw!)}>
        dev · {label}
      </button>
    ))}
  </div>
);

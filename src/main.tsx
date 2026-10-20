/**
 * Entry.
 *
 * Signed out, only the sign-in screen loads: the rest of the app (lessons,
 * content, stores) is fetched in the background while the person types, so
 * the first screen paints without waiting for it. Signed in, the app loads
 * directly.
 *
 * LazyMotion keeps Motion's animation engine out of the first download, and
 * `strict` fails loudly if a heavy `motion.*` element slips back in.
 * MotionConfig makes every JS-driven animation honour reduced motion;
 * theme.css does the same for CSS ones.
 */
import './app/textSize'; // applies the saved text size before the first paint
import { createRoot } from 'react-dom/client';
import { lazy, Suspense, useEffect } from 'react';
import { LazyMotion, MotionConfig } from 'motion/react';
import './ui/theme.css';
// The v3 benchmark's rules apply only under html[data-system="v3"] (ui/systemScope.ts).
import './ui/system-v3.css';
import { ErrorBoundary } from './app/ErrorBoundary';
import { LoginView } from './features/login/LoginView';
import { identityStore, useIdentity } from './app/identity/identityStore';
import { signInWithDemo } from './app/signIn';
import { toHash, type View } from './app/router';
import { t } from './app/i18n';

const loadApp = () => import('./app/App');
const App = lazy(() => loadApp().then(m => ({ default: m.App })));
const loadMotionFeatures = () => import('./ui/motionFeatures').then(r => r.default);

const Root = () => {
  useIdentity(); // re-render on sign-in / sign-out
  const signedIn = identityStore.currentUser() !== null;

  // While the sign-in screen is up, fetch the app so it is ready on submit.
  useEffect(() => { if (!signedIn) void loadApp(); }, [signedIn]);

  if (!signedIn) {
    return (
      <LoginView onSignIn={(username, password) => {
        const result = signInWithDemo(username, password);
        if ('error' in result) return result.error;
        // The app reads its first screen from the URL when it mounts.
        history.replaceState(null, '', toHash({ kind: result.landing } as View));
        return null;
      }} />
    );
  }
  return (
    <Suspense fallback={<div role="status" className="min-h-screen c-tx3" style={{ display: 'grid', placeItems: 'center' }}>{t('sh.loading')}</div>}>
      <App />
    </Suspense>
  );
};

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <Root />
      </MotionConfig>
    </LazyMotion>
  </ErrorBoundary>,
);

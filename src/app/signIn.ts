/**
 * Demo sign-in, shared by the standalone sign-in screen (main.tsx) and the
 * app's own gate. Opens the session and returns where the person lands, which
 * is derived from their permissions, never hard-coded per role.
 */
import { authenticate } from './demo/credentials';
import { identityStore } from './identity/identityStore';
import { can, type Permission } from '../domain/identity';
import { landingFor, type PlatformView } from '../domain/identity/access';
import { t } from './i18n';

export type SignInResult = { readonly error: string } | { readonly landing: PlatformView };

export function signInWithDemo(username: string, password: string): SignInResult {
  const account = authenticate(username, password);
  if (!account) return { error: t('door.err.wrong') };
  identityStore.signIn(account.id);
  const landing = landingFor((p: Permission) => can(identityStore.currentUser(), identityStore.get().roles, p));
  if (!landing) {
    identityStore.signOut();
    return { error: t('door.err.noaccess') };
  }
  return { landing };
}

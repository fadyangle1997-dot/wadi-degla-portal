/**
 * An operational issue in the reader's language. The health engine
 * (domain/operations/health) says WHAT is wrong and about whom — a kind and a
 * target; the sentence and the fix are product language, so they live in the
 * dictionary and follow the interface language, the person's own spelling of
 * their name, and the branch's name rather than its id.
 */
import type { OperationalIssue } from '../../domain/operations/health';
import { displayNameOf, type User } from '../../domain/identity';
import { branchNameOf, type Branch } from '../../domain/organization';
import { tf, t, type Key, type Lang } from '../../app/i18n';

export function issueText(i: OperationalIssue, users: readonly User[], branches: readonly Branch[], lang: Lang): { message: string; action: string } {
  const user = i.targetUserId ? users.find(u => u.id === i.targetUserId) : undefined;
  const name = user ? displayNameOf(user, lang) : (i.targetUserId ?? '');
  const branch = branchNameOf(i.targetBranch ?? user?.branchId, branches);
  return {
    message: tf(`oi.${i.kind}.msg` as Key, { name, branch }, lang),
    action: t(`oi.${i.kind}.act` as Key, lang),
  };
}

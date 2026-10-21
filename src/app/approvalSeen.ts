/**
 * The last unit approval a trainee has acknowledged — per person, on this
 * device. It only decides whether the mission paper opens with «اتعتمدت»;
 * the approval itself lives in the training log. Best-effort like the
 * language choice: cleared storage shows the latest approval once more.
 */
const key = (id: string) => `wda.approvalseen.v1.${id}`;

export const approvalSeen = {
  get: (id: string): number => {
    try { return Number(localStorage.getItem(key(id)) ?? 0) || 0; } catch { return 0; }
  },
  mark: (id: string, at: number) => {
    if (!id) return;
    try { localStorage.setItem(key(id), String(at)); } catch { /* best effort */ }
  },
};

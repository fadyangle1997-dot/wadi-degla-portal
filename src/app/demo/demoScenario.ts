/**
 * The showcase scenario: every demo trainee at a different point of the
 * 60-day programme, one unit waiting for its trainer, one graduate waiting for
 * the manager's decision. Loaded on request from the admin platform, so
 * people testing the prototype see the trainer and manager screens with real
 * work in them instead of rows of zeros.
 *
 * Everything is written as real events by the person they belong to (see
 * seedTraineeProgress), so the scenario exercises the same rules as real use.
 */
import { DEMO_ACCOUNTS, seedTraineeProgress } from './demoAccounts';
import { trainingStore } from '../training/trainingStore';
import { progressKeysFor } from '../backend';

const trainees = () => DEMO_ACCOUNTS.filter(a => a.roleId === 'employee');

/** Removes every training record and every demo trainee's progress on this device. */
export function clearDemoTraining(): void {
  trainingStore.reset();
  for (const a of trainees()) {
    const keys = progressKeysFor(a.id);
    try {
      localStorage.removeItem(keys.snapshot);
      localStorage.removeItem(keys.log);
    } catch { /* storage unavailable: nothing persisted to clear */ }
  }
}

/** Clears, then rebuilds the showcase state for all demo trainees. */
export function loadDemoScenario(): void {
  clearDemoTraining();
  for (const a of trainees()) seedTraineeProgress(a);
}

import { existsSync } from 'node:fs';

/** The Chromium to drive: PW_CHROMIUM_PATH, then the container's copy, then
 *  Playwright's own (undefined lets Playwright find it). */
export const chromiumPath = () =>
  process.env.PW_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

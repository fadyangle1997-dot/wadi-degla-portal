/**
 * The keyboard and screen-reader pass (KEYS=1): what an automated scan cannot
 * see. From the top of each state it presses Tab until focus comes round,
 * and records every stop:
 *
 *   ring      the focus outline is drawn (2px or more, not «none»)
 *   ringK     its contrast against what is behind the control (3:1 needed)
 *   inView    the focused control is on screen (focus never hides)
 *   size      under 44×44 is listed (WCAG 2.5.5); inline links in prose are not
 *
 * plus the page's outline from the accessibility tree: headings by level,
 * landmarks, and controls whose names are empty or repeated.
 */
export async function keyboardPass(page) {
  // Start from the top of the document: blurring alone leaves the browser's
  // starting point where focus was (often the stage's <main>), and the walk
  // would miss everything above it. A throwaway focus target at the very start
  // moves that point to the top.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const start = document.createElement('span');
    start.tabIndex = -1; start.id = 'kb-start';
    document.body.prepend(start); start.focus();
  });
  const stops = [];
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press('Tab');
    const s = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
      const rgb = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return { c: a.slice(0, 3), a: a.length > 3 ? a[3] : 1 }; };
      const bgOf = e0 => { const st = []; for (let e = e0; e; e = e.parentElement) { const b = rgb(getComputedStyle(e).backgroundColor); if (b && b.a > 0) { st.push(b); if (b.a >= 1) break; } } let c = [13, 11, 9]; for (const b of st.reverse()) c = c.map((x, i) => b.c[i] * b.a + x * (1 - b.a)); return c; };
      // Some controls draw their focus on what they stand for: a table row's
      // open button rings the whole row (and its target is the row), a
      // roadmap stop rings its disc, a search box rings its frame. Measure
      // the element that actually shows it.
      const ringEl = (el.matches('.dt-open') && el.closest('tr'))
        || (el.matches('.jmap-btn') && el.querySelector('.jmap-disc'))
        || el.closest('.dt-search') || el;
      const cs = getComputedStyle(ringEl);
      const r = (el.matches('.dt-open') && el.closest('tr') || el).getBoundingClientRect();
      const ring = cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2;
      const oc = rgb(cs.outlineColor);
      const behind = bgOf(ringEl.parentElement || ringEl);
      const [hi, lo] = oc ? [lum(oc.c), lum(behind)].sort((a, b) => b - a) : [0, 0];
      const name = (el.getAttribute('aria-label') || el.innerText || el.getAttribute('placeholder') || el.tagName).trim().replace(/\s+/g, ' ').slice(0, 36);
      const inlineLink = el.matches('a') && el.parentElement?.matches('p, li, span') && (el.parentElement.textContent || '').trim().length > (el.textContent || '').trim().length + 4;
      return {
        key: `${name}|${Math.round(r.left)},${Math.round(r.top + scrollY)}`, name, tag: el.tagName.toLowerCase(),
        ring, ringK: oc ? +((hi + 0.05) / (lo + 0.05)).toFixed(2) : 0,
        inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth,
        w: Math.round(r.width), h: Math.round(r.height), inlineLink,
      };
    });
    if (!s) break;                                  // focus left the document: the end of the order
    if (stops.length && stops[0].key === s.key) break; // came round to the first stop
    if (stops.length && stops[stops.length - 1].key === s.key) { stops.push({ ...s, trapped: true }); break; }
    stops.push(s);
  }
  await page.evaluate(() => { document.getElementById('kb-start')?.remove(); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); window.scrollTo(0, 0); });
  const aria = await page.locator('body').ariaSnapshot();
  const lines = aria.split('\n');
  const headings = lines.map(l => l.match(/heading "(.*)" \[level=(\d)\]/)).filter(Boolean).map(m => `h${m[2]} ${m[1].slice(0, 40)}`);
  const landmarks = lines.map(l => l.match(/^\s*- (main|navigation|banner|contentinfo|complementary|region)(?: "(.*?)")?/)).filter(Boolean).map(m => m[2] ? `${m[1]} «${m[2]}»` : m[1]);
  const names = lines.map(l => l.match(/- (button|link|textbox|radio|checkbox)(?: "(.*?)")?/)).filter(Boolean).map(m => ({ role: m[1], name: m[2] ?? '' }));
  const unnamed = names.filter(n => !n.name.trim()).map(n => n.role);
  const seen = new Map(); for (const n of names) { const k = `${n.role} «${n.name}»`; seen.set(k, (seen.get(k) ?? 0) + 1); }
  const repeated = [...seen].filter(([, c]) => c > 1).map(([k, c]) => `${k}×${c}`);
  return {
    stops: stops.length,
    noRing: stops.filter(s => !s.ring).map(s => s.name),
    lowRing: stops.filter(s => s.ring && s.ringK < 3).map(s => `${s.name} ${s.ringK}:1`),
    offView: stops.filter(s => !s.inView).map(s => s.name),
    trapped: stops.filter(s => s.trapped).map(s => s.name),
    under44: stops.filter(s => !s.inlineLink && (s.w < 44 || s.h < 44)).map(s => `${s.name} ${s.w}×${s.h}`),
    order: stops.map(s => s.name),
    headings, landmarks, unnamed, repeated,
  };
}

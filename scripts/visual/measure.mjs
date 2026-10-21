/**
 * What a capture measures, in the page: the numbers the Phase 1 exit criteria
 * name. Runs inside the browser via page.evaluate, so it may only use DOM APIs.
 *
 *   overflow      horizontal page overflow in px (0 is the only pass)
 *   aaaPct        share of visible characters at WCAG AAA contrast
 *   belowAA       characters under AA (must be 0)
 *   offScale      text whose computed size is not one of the nine steps
 *   gold          elements painting one of the brand golds: accentGold (fills,
 *                 text, accent borders) plus edgeGold (only the control edge,
 *                 #8D6C1A, on fields and outlined buttons). goldSamples names
 *                 them, so each one can be checked against its role.
 *   clipped       controls whose label is cut off (scrollWidth > clientWidth)
 *   smallTargets  interactive targets under 24×24 px
 *   lang, system  the document's language and design-system scope
 */
export function measureInPage() {
  const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const a = m[1].split(',').map(Number); return { c: a.slice(0, 3), a: a.length > 3 ? a[3] : 1 }; };
  // The colour behind an element, composited up its ancestors; a background
  // image (grain, paper tooth) is treated as its solid colour underneath.
  const bgOf = el => {
    const stack = [];
    for (let e = el; e; e = e.parentElement) {
      const b = rgb(getComputedStyle(e).backgroundColor);
      if (b && b.a > 0) { stack.push(b); if (b.a >= 1) break; }
    }
    let c = [13, 11, 9];
    for (const b of stack.reverse()) c = c.map((x, i) => b.c[i] * b.a + x * (1 - b.a));
    return c;
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

  // The nine steps, as this page resolves them (text size and breakpoint included).
  const steps = new Set();
  for (let n = 1; n <= 9; n++) {
    const probe = document.createElement('span');
    probe.style.fontSize = `var(--fs-${n})`;
    document.body.appendChild(probe);
    steps.add(Math.round(parseFloat(getComputedStyle(probe).fontSize) * 10) / 10);
    probe.remove();
  }

  const ACCENT = ['rgb(179, 137, 34)', 'rgb(204, 171, 108)', 'rgb(254, 222, 160)', 'rgb(124, 95, 23)'];
  const EDGE = 'rgb(141, 108, 26)';
  let chars = 0, aaa = 0, belowAA = 0, accentGold = 0, edgeGold = 0, targets = 0;
  const lows = [], off = [], small = [], clipped = [], golds = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"], .sr-only, .skip-link')) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (el.matches('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="menuitem"]') && !el.matches('input[type="radio"], input[type="checkbox"]')) {
      targets++;
      if (r.height < 24 || r.width < 24) small.push((el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 30));
      if (el.matches('button, a[href]') && el.scrollWidth > el.clientWidth + 2 && cs.overflow !== 'visible') clipped.push((el.textContent || '').trim().slice(0, 30));
    }
    const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
    if (text) {
      const px = Math.round(parseFloat(cs.fontSize) * 10) / 10;
      if (!steps.has(px) && !el.closest('svg')) off.push(`${px}px «${text.slice(0, 16)}»`);
      const fg = rgb(cs.color);
      if (fg) {
        const k = ratio(fg.c, bgOf(el));
        const large = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
        chars += text.length;
        if (k >= (large ? 4.5 : 7)) aaa += text.length; else lows.push(`${k.toFixed(2)} «${text.slice(0, 20)}»`);
        if (k < (large ? 3 : 4.5)) belowAA += text.length;
      }
    }
    const paints = [text ? cs.color : '', cs.backgroundColor, parseFloat(cs.borderTopWidth) > 0 ? cs.borderTopColor : '', parseFloat(cs.borderInlineStartWidth) > 0 ? cs.borderInlineStartColor : ''];
    const accent = paints.some(c => ACCENT.includes(c)), edge = !accent && paints.includes(EDGE);
    if (accent) accentGold++; else if (edge) edgeGold++;
    if (accent || edge) golds.push(`${edge ? 'edge ' : ''}${el.tagName.toLowerCase()}${el.classList[0] ? `.${el.classList[0]}` : ''}`);
  }
  return {
    overflow: document.documentElement.scrollWidth - innerWidth,
    aaaPct: chars ? +(100 * aaa / chars).toFixed(1) : null, belowAA, lows: lows.slice(0, 5),
    offScale: off.length, offSamples: [...new Set(off)].slice(0, 6),
    gold: accentGold + edgeGold, accentGold, edgeGold, goldSamples: golds.slice(0, 8), targets, smallTargets: small.length, small: small.slice(0, 4), clipped: clipped.slice(0, 4),
    h1: [...document.querySelectorAll('h1')].map(h => h.textContent.trim().slice(0, 50)),
    height: document.documentElement.scrollHeight,
    system: document.documentElement.dataset.system || 'v2', lang: document.documentElement.lang,
  };
}

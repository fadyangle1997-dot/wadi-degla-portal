/**
 * useModal — what every overlay owes the person using it: focus moves in,
 * Tab stays inside, Escape dismisses, and focus goes back to whatever opened
 * it. Overlays stack (a confirmation inside the employee file), so only the
 * top one answers Escape and Tab.
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
const stack: object[] = [];

export function useModal<T extends HTMLElement>(
  onDismiss: () => void,
  /** Where focus starts; the surface itself when absent. */
  initialFocus?: () => HTMLElement | null,
) {
  const ref = useRef<T>(null);
  const dismissRef = useRef(onDismiss);
  const startRef = useRef(initialFocus);
  useEffect(() => { dismissRef.current = onDismiss; startRef.current = initialFocus; });

  useEffect(() => {
    const me = {};
    stack.push(me);
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    (startRef.current?.() ?? ref.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === 'Escape') { e.stopPropagation(); dismissRef.current(); return; }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [...ref.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(el => el.getClientRects().length > 0);
      const first = items[0], last = items[items.length - 1];
      if (!first || !last) return;
      const at = document.activeElement;
      if (e.shiftKey && (at === first || at === ref.current)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const i = stack.indexOf(me);
      if (i >= 0) stack.splice(i, 1);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return ref;
}

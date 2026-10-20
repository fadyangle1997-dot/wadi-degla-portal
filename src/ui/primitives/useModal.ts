/**
 * useModal — what every overlay owes the person using it: focus moves in,
 * Tab stays inside, Escape dismisses, and focus goes back to whatever opened
 * it. Overlays stack (a confirmation inside the employee file), so only the
 * top one answers Escape and Tab.
 *
 * An overlay that lives in the URL (useOverlayParam) says so: Back closes it
 * through history. One that does not — a confirmation, a menu — is dismissed
 * by Back the way Escape dismisses it (see app/overlayHistory).
 */
import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';
interface Layer { readonly dismiss: () => void; readonly addressable: boolean }
const stack: Layer[] = [];

/** The overlay on top, if any. */
export const topModal = (): Layer | undefined => stack[stack.length - 1];

export function useModal<T extends HTMLElement>(
  onDismiss: () => void,
  /** Where focus starts; the surface itself when absent. */
  initialFocus?: () => HTMLElement | null,
  /** True when the overlay is in the URL, so Back already closes it. */
  addressable = false,
) {
  const ref = useRef<T>(null);
  const dismissRef = useRef(onDismiss);
  const startRef = useRef(initialFocus);
  const addressableRef = useRef(addressable);
  useEffect(() => { dismissRef.current = onDismiss; startRef.current = initialFocus; addressableRef.current = addressable; });

  useEffect(() => {
    const me: Layer = { dismiss: () => dismissRef.current(), get addressable() { return addressableRef.current; } };
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

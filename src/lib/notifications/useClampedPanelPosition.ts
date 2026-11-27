import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

/** Shared by both notification panels (NOTIF-1) — pure positioning math, not panel UI/behavior, so
 * it doesn't collapse the two panels back into one shared component the way `NotificationsMenu`
 * was. Anchoring a dropdown with `right: 0` only lines its right edge up with its trigger
 * button's right edge, which is only the viewport's right edge when the button happens to be the
 * last element in its row (true for the learner header's mobile bell, not true for the staff
 * header, where an account avatar sits after the bell) — on a narrow viewport that mismatch runs
 * the panel off the left edge of the screen. `position: fixed`, computed from the trigger's real
 * bounding box and clamped to stay within `margin` of both viewport edges, fixes that regardless
 * of what else is in the row.
 *
 * Measured in a `requestAnimationFrame` rather than synchronously on open, and re-measured on
 * scroll (capture-phase, so a scroll on any ancestor container counts, not just the window) —
 * opening the panel can itself trigger a browser scroll-into-view on the trigger button, and
 * reading `getBoundingClientRect()` before that settles produced a stale, badly-off-screen
 * position (observed: `top: -149.5px`) when the button had been off-screen a moment earlier. */
export function useClampedPanelPosition(
  triggerRef: RefObject<HTMLElement | null>,
  open: boolean,
  { width = 384, margin = 16 }: { width?: number; margin?: number } = {},
): CSSProperties {
  const [style, setStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    function place() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelWidth = Math.min(width, window.innerWidth - margin * 2);
      const left = Math.max(
        margin,
        Math.min(rect.right - panelWidth, window.innerWidth - panelWidth - margin),
      );
      const top = Math.max(margin, rect.bottom + 8);
      setStyle({ position: 'fixed', top, left, width: panelWidth });
    }
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, { capture: true, passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, { capture: true });
    };
  }, [open, triggerRef, width, margin]);

  return style;
}

// Shared focus-management hook for modal dialogs.
//
// Gives any conditionally-rendered modal the standard dialog keyboard
// behaviour in one place:
//
//   • On open, moves focus into the dialog — to `initialFocusRef` if
//     provided, otherwise the first focusable element in the container.
//   • Traps Tab / Shift+Tab inside the dialog so keyboard users can't
//     tab out into the (visually obscured) page behind the overlay.
//   • Closes on Escape via `onClose` — unless `busy` is true, mirroring
//     the "don't strand the user mid-action" overlay-click guard the
//     dialogs already use.
//   • On close/unmount, restores focus to whatever element had it before
//     the dialog opened.
//
// Usage: attach the returned ref to the dialog card element (the white
// box, not the overlay) and pair it with role="dialog" aria-modal="true".

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

interface UseModalA11yOptions {
  /**
   * Whether the dialog is currently shown. Defaults to true for modals
   * that are conditionally mounted by their parent (e.g. OnboardingSplash);
   * pass the isOpen prop for modals that render null themselves.
   */
  isOpen?: boolean;
  /** Called when the user presses Escape (suppressed while busy). */
  onClose: () => void;
  /** While true, Escape is ignored — e.g. an async delete is in flight. */
  busy?: boolean;
  /** Element to receive focus when the dialog opens; falls back to the first focusable element. */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
}

export function useModalA11y<T extends HTMLElement = HTMLDivElement>({
  isOpen = true,
  onClose,
  busy = false,
  initialFocusRef,
}: UseModalA11yOptions) {
  const containerRef = useRef<T>(null);

  // Mirror the latest callbacks/flags into refs so the open/close effect
  // below doesn't have to re-run (and re-steal focus) on every render.
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const initialFocusRefRef = useRef(initialFocusRef);
  useEffect(() => {
    onCloseRef.current = onClose;
    busyRef.current = busy;
    initialFocusRefRef.current = initialFocusRef;
  });

  useEffect(() => {
    if (!isOpen) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Move focus into the dialog.
    const initial =
      initialFocusRefRef.current?.current ??
      container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR) ??
      container;
    initial.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (!busyRef.current) {
          event.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const focusables = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter(
        // Skip elements hidden via display:none (offsetParent is null for
        // those), but never filter out whatever currently holds focus.
        (el) => el.offsetParent !== null || el === document.activeElement
      );
      if (focusables.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      const insideDialog = active !== null && container.contains(active);

      if (event.shiftKey) {
        if (!insideDialog || active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (!insideDialog || active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Capture phase so the trap wins even if focus is on an element with
    // its own key handlers.
    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      // Restore focus to wherever the user was before the dialog opened.
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  return containerRef;
}

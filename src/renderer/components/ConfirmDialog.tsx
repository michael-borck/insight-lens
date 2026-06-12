// A small reusable confirm-before-acting dialog. Used for destructive
// actions like deleting a unit or a single survey — anywhere the user
// shouldn't be one mis-click away from data loss.
//
// Renders nothing when isOpen=false (so callers can keep it mounted as a
// child without paying overlay-render cost when closed). Same modal-frame
// shape (fixed inset-0, dark overlay, centred card) as the existing
// CourseImprovementModal for visual consistency.

import React, { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  /** Body text. Pass a string for plain copy or a ReactNode for richer content (e.g. a counts list). */
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** If true, the confirm button is styled in error-red and the dialog uses warning iconography. */
  destructive?: boolean;
  /** Disable the confirm button while an async action is in flight, prevents double-submit. */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // Initial focus lands on Cancel — the safe default for destructive
  // dialogs (Enter won't accidentally confirm a delete). Escape cancels
  // unless an async action is in flight.
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalA11y<HTMLDivElement>({
    isOpen,
    onClose: onCancel,
    busy,
    initialFocusRef: cancelRef,
  });

  if (!isOpen) return null;

  const confirmClasses = destructive
    ? 'bg-error-500 hover:bg-error-700 text-white'
    : 'bg-primary-600 hover:bg-primary-700 text-white';

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      // Close on overlay click — but only if not busy (don't strand the user mid-delete).
      onClick={() => !busy && onCancel()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl"
        // Stop propagation so clicks inside the card don't trigger the overlay close.
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 mb-4">
          {destructive && (
            <div className="p-2 bg-error-500 bg-opacity-10 rounded-lg shrink-0">
              <AlertTriangle className="w-5 h-5 text-error-500" />
            </div>
          )}
          <div>
            <h3 id="confirm-dialog-title" className="text-lg font-medium text-primary-800 font-serif">{title}</h3>
          </div>
        </div>

        <div id="confirm-dialog-message" className="text-sm text-primary-700 mb-6">{message}</div>

        <div className="flex justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-200 rounded-md hover:bg-primary-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 text-sm font-medium rounded-md disabled:opacity-50 ${confirmClasses}`}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

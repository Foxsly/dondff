import React, { useCallback, useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { CloseIcon } from './icons';

export type ModalSize = 'sm' | 'md' | 'lg';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: ModalSize;
  /** Rendered right-aligned in the footer. Usually a cancel + confirm pair. */
  footer?: React.ReactNode;
  /** Set false for destructive confirmations that need a deliberate choice. */
  dismissOnBackdrop?: boolean;
  children?: React.ReactNode;
}

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Dialog rendered into a portal at document.body.
 *
 * The portal matters: rendering in place would let an ancestor's `overflow`
 * or stacking context clip the dialog, which is a common way modals end up
 * half-visible inside a scrolling card.
 *
 * Handles the four things a dialog has to get right, none of which the old
 * inline expanding forms did:
 *   - focus moves into the dialog on open and returns to the trigger on close
 *   - Tab is trapped inside while it is open
 *   - Escape closes it
 *   - background scrolling is locked
 */
export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  description,
  size = 'md',
  footer,
  dismissOnBackdrop = true,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusable || focusable.length === 0) {
        // Nothing to tab to — keep focus on the panel rather than escaping.
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      // Wrap in both directions so focus can never leave the dialog.
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;

    // Prefer the first *meaningful* control. The close button sits first in DOM
    // order, so taking focusable[0] would open every dialog with "Close"
    // selected — technically fine, but it puts dismissal under the first
    // keystroke instead of the field the user came to fill in. Fall back to the
    // close button, then the panel, so focus is never left on the page beneath.
    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [],
    );
    const firstControl = focusable.find((el) => !el.hasAttribute('data-modal-close'));
    (firstControl ?? focusable[0] ?? panelRef.current)?.focus();

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onKeyDown={handleKeyDown}
    >
      <div
        className="absolute inset-0 animate-fade-in bg-black/70"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-slide-up rounded-xl border border-border bg-surface shadow-overlay',
          'max-h-[calc(100vh-2rem)] overflow-y-auto',
          sizes[size],
        )}
      >
        <div className="flex items-start gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-text-strong">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            data-modal-close
            className="-m-1 shrink-0 rounded p-1 text-text-subtle transition-colors hover:bg-surface-raised hover:text-text"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;

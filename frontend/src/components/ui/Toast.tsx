import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/cn';
import { CheckIcon, CloseIcon, InfoIcon, WarningIcon } from './icons';

export type ToastVariant = 'info' | 'success' | 'warn' | 'danger';

export interface ToastOptions {
  message: string;
  variant?: ToastVariant;
  /** Milliseconds before auto-dismiss. Pass 0 to require a manual dismiss. */
  duration?: number;
}

interface ToastRecord extends Required<ToastOptions> {
  id: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Fire-and-forget feedback for actions that would otherwise be silent —
 * creating a league, joining with a code, copying an access code.
 *
 *   const { success, error } = useToast();
 *   success('League created');
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside a ToastProvider');
  }
  return context;
};

const variants: Record<ToastVariant, { box: string; icon: string; Icon: React.FC<{ className?: string }> }> = {
  info: { box: 'border-info/40', icon: 'text-info', Icon: InfoIcon },
  success: { box: 'border-success/40', icon: 'text-success', Icon: CheckIcon },
  warn: { box: 'border-warn/40', icon: 'text-warn', Icon: WarningIcon },
  danger: { box: 'border-danger/40', icon: 'text-danger', Icon: WarningIcon },
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  // A ref, not state: incrementing it must not trigger a render, and two
  // toasts fired in the same tick must not collide on the same key.
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    ({ message, variant = 'info', duration = 4000 }: ToastOptions) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant, duration }]);

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      success: (message: string) => toast({ message, variant: 'success' }),
      error: (message: string) => toast({ message, variant: 'danger', duration: 6000 }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {createPortal(
        <div
          // The live region wraps the list and is always mounted, so additions
          // are announced. A region that appears at the same time as its first
          // message is usually missed by screen readers.
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2"
        >
          {toasts.map((item) => {
            const { box, icon, Icon } = variants[item.variant];
            return (
              <div
                key={item.id}
                className={cn(
                  'pointer-events-auto flex animate-slide-up items-start gap-3 rounded-lg border bg-surface-overlay p-3.5 shadow-overlay',
                  box,
                )}
              >
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} />
                <p className="min-w-0 flex-1 text-sm text-text">{item.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  aria-label="Dismiss notification"
                  className="-m-1 shrink-0 rounded p-1 text-text-subtle transition-colors hover:text-text"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
};

export default ToastProvider;

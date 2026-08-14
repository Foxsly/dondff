import React from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon, CloseIcon, InfoIcon, WarningIcon } from './icons';

export type AlertVariant = 'info' | 'success' | 'warn' | 'danger';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variants: Record<AlertVariant, { box: string; icon: string; Icon: React.FC<{ className?: string }> }> = {
  info: { box: 'bg-info/10 border-info/30', icon: 'text-info', Icon: InfoIcon },
  success: { box: 'bg-success/10 border-success/30', icon: 'text-success', Icon: CheckIcon },
  warn: { box: 'bg-warn/10 border-warn/30', icon: 'text-warn', Icon: WarningIcon },
  danger: { box: 'bg-danger/10 border-danger/30', icon: 'text-danger', Icon: WarningIcon },
};

/**
 * Inline message block — form-level errors, empty-league notices, warnings.
 *
 * Errors and warnings get `role="alert"` so they interrupt and are announced
 * immediately; info and success use `role="status"`, which waits for a pause
 * rather than cutting off whatever is being read.
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onDismiss,
  className,
}) => {
  const { box, icon, Icon } = variants[variant];
  const assertive = variant === 'danger' || variant === 'warn';

  return (
    <div
      role={assertive ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded border p-3.5 text-sm', box, className)}
    >
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', icon)} />

      <div className="min-w-0 flex-1">
        {title && <p className={cn('font-semibold', icon)}>{title}</p>}
        {children && <div className={cn('text-text-muted', title && 'mt-0.5')}>{children}</div>}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-m-1 shrink-0 self-start rounded p-1 text-text-subtle transition-colors hover:text-text"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

export default Alert;

import React from 'react';
import { cn } from '../../lib/cn';
import { Button } from './Button';
import { WarningIcon } from './icons';

export interface ErrorDisplayProps {
  title?: string;
  message: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

/**
 * Page-level failure state.
 *
 * Kept at its original path and prop shape so existing pages pick this up
 * without an edit. `role="alert"` means the failure is announced when it
 * replaces the loading state, rather than silently swapping in.
 */
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Something went wrong',
  message,
  action,
  className,
}) => (
  <div
    role="alert"
    className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-danger/30 bg-danger/5 px-6 py-12 text-center',
      className,
    )}
  >
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
      <WarningIcon className="h-6 w-6" />
    </div>

    <h2 className="text-lg font-semibold text-text-strong">{title}</h2>
    <p className="mt-1.5 max-w-md text-sm text-text-muted">{message}</p>

    {action && (
      <Button variant="secondary" className="mt-5" onClick={action.onClick}>
        {action.label}
      </Button>
    )}
  </div>
);

export default ErrorDisplay;

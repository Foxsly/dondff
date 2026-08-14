import React from 'react';
import { cn } from '../../lib/cn';
import { InboxIcon } from './icons';

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  /** Primary and (optionally) secondary calls to action. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Shown where a list would be — no leagues, no entries, no seasons yet.
 *
 * Always takes an action: an empty state that only says "nothing here" leaves
 * the user with nowhere to go, which is exactly where the old dashboard left
 * someone who had just signed up.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center',
      className,
    )}
  >
    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-text-subtle">
      {icon ?? <InboxIcon className="h-6 w-6" />}
    </div>

    <h3 className="text-base font-semibold text-text-strong">{title}</h3>

    {description && (
      <p className="mt-1.5 max-w-sm text-sm text-text-muted">{description}</p>
    )}

    {action && <div className="mt-5 flex flex-wrap items-center justify-center gap-3">{action}</div>}
  </div>
);

export default EmptyState;

import React from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

export interface LoadingSpinnerProps {
  message?: string;
  className?: string;
}

/**
 * Centred loading block for a whole page or panel.
 *
 * Kept at its original path and prop shape so the pages already importing it
 * pick this up without an edit — the previous implementation rendered a bare
 * `<p>Loading...</p>`.
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  className,
}) => (
  <div
    className={cn('flex flex-col items-center justify-center gap-3 py-12', className)}
    aria-busy="true"
  >
    <Spinner size="lg" className="text-brand" label={null} />
    {/* The text carries the announcement, so the ring itself stays silent
        rather than both of them being read out. */}
    <p role="status" className="text-sm text-text-muted">
      {message}
    </p>
  </div>
);

export default LoadingSpinner;

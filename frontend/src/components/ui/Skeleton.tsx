import React from 'react';
import { cn } from '../../lib/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Convenience for the common "a few lines of text" case. */
  lines?: number;
}

/**
 * Loading placeholder.
 *
 * Marked `aria-hidden` and given no text: assistive tech should hear the
 * region's own loading state (via aria-busy on the container), not a run of
 * meaningless boxes.
 */
export const Skeleton: React.FC<SkeletonProps> = ({ lines, className, ...rest }) => {
  if (lines && lines > 1) {
    return (
      <div className="flex flex-col gap-2" aria-hidden {...rest}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'h-3.5 animate-pulse rounded bg-surface-raised',
              // Ragged last line reads as text rather than as a block.
              i === lines - 1 ? 'w-2/3' : 'w-full',
              className,
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className={cn('h-3.5 w-full animate-pulse rounded bg-surface-raised', className)}
      {...rest}
    />
  );
};

export default Skeleton;

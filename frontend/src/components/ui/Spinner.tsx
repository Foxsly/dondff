import React from 'react';
import { cn } from '../../lib/cn';

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Accessible label. Set to null inside a control that already announces itself. */
  label?: string | null;
}

const sizes: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

/**
 * Indeterminate progress ring.
 *
 * Built from a bordered circle rather than an SVG so it inherits `currentColor`
 * on three sides and goes transparent on the fourth — which means it works on
 * any background without being told what colour to be.
 */
export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className, label = 'Loading' }) => (
  <span
    className={cn(
      'inline-block shrink-0 animate-spin rounded-full border-current border-r-transparent align-[-0.125em]',
      sizes[size],
      className,
    )}
    role={label ? 'status' : undefined}
    aria-label={label ?? undefined}
    aria-hidden={label ? undefined : true}
  />
);

export default Spinner;

import React from 'react';
import { cn } from '../../lib/cn';

export type StatTone = 'default' | 'brand' | 'success' | 'muted';
export type StatSize = 'sm' | 'md' | 'lg';

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value — "of 32 projected", a delta, a rank. */
  hint?: string;
  tone?: StatTone;
  size?: StatSize;
  align?: 'left' | 'right';
  className?: string;
}

const tones: Record<StatTone, string> = {
  default: 'text-text',
  brand: 'text-brand',
  success: 'text-success',
  muted: 'text-text-muted',
};

const valueSizes: Record<StatSize, string> = {
  sm: 'text-lg',
  md: 'text-2xl',
  lg: 'text-3xl',
};

/**
 * Label-over-figure stat, as used for projected and final scores.
 *
 * The value is always tabular (`tnum`): score columns that re-render with
 * proportional digits shift horizontally on every update, which reads as the
 * layout twitching. This is the same micro-label + monospaced-figure pairing
 * the standings card uses, extracted so the rest of the app can match it.
 */
export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  hint,
  tone = 'default',
  size = 'md',
  align = 'left',
  className,
}) => (
  <div className={cn(align === 'right' && 'text-right', className)}>
    <div className="text-label uppercase text-text-subtle">{label}</div>

    <div className={cn('tnum mt-1 font-mono font-semibold leading-tight', valueSizes[size], tones[tone])}>
      {value}
    </div>

    {hint && <div className="mt-0.5 text-xs text-text-subtle">{hint}</div>}
  </div>
);

export default StatTile;

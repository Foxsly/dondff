import React from 'react';
import { cn } from '../../lib/cn';

export type BadgeVariant =
  | 'neutral'
  | 'brand'
  | 'success'
  | 'warn'
  | 'danger'
  | 'info'
  | 'gold';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children?: React.ReactNode;
}

/**
 * Small status pill — sport, role, event status, injury flag.
 *
 * Every variant is a tinted fill plus a matching border at higher opacity,
 * which keeps them legible against both `bg-surface` and `bg-surface-raised`
 * without needing a variant per background.
 */
const variants: Record<BadgeVariant, string> = {
  neutral: 'bg-text-subtle/15 text-text-muted border-text-subtle/30',
  brand: 'bg-brand/15 text-brand border-brand/30',
  success: 'bg-success/15 text-success border-success/30',
  warn: 'bg-warn/15 text-warn border-warn/30',
  danger: 'bg-danger/15 text-danger border-danger/30',
  info: 'bg-info/15 text-info border-info/30',
  gold: 'bg-gold-bg text-gold border-gold-border',
};

const sizes: Record<BadgeSize, string> = {
  sm: 'text-label px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  className,
  children,
  ...rest
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-semibold uppercase tracking-wide',
      variants[variant],
      sizes[size],
      className,
    )}
    {...rest}
  >
    {children}
  </span>
);

export default Badge;

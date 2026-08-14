import React from 'react';
import { cn } from '../../lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-contrast hover:bg-brand-hover active:bg-brand-active',
  secondary:
    'bg-surface-raised text-text border border-border hover:bg-surface-overlay hover:border-border-strong',
  outline:
    'border border-brand text-brand bg-transparent hover:bg-brand hover:text-brand-contrast',
  ghost: 'bg-transparent text-text-muted hover:bg-surface-raised hover:text-text',
  danger: 'bg-danger text-bg hover:brightness-110 active:brightness-95',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

/**
 * The class string for a button, without rendering one.
 *
 * Plenty of "buttons" in this app are really router links (`<Link to="/game">`).
 * Rather than making Button polymorphic — which drags in a lot of generic
 * typing for very little — those call this directly:
 *
 *   <Link to="/dashboard" className={buttonVariants({ variant: 'primary' })}>
 */
export const buttonVariants = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
}: ButtonVariantOptions = {}): string =>
  cn(
    // Display face + wide tracking is what gives controls the broadcast feel.
    'inline-flex items-center justify-center whitespace-nowrap rounded font-display font-semibold tracking-wide',
    'transition-colors duration-150',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
  );

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantOptions {
  /** Swaps the leading icon for a spinner and blocks interaction. */
  loading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant,
      size = 'md',
      fullWidth,
      loading = false,
      iconLeft,
      iconRight,
      disabled,
      className,
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      // Defaulting to "button" matters: a bare <button> inside a <form> submits
      // it, which is almost never what a secondary action wants.
      type={type}
      disabled={disabled || loading}
      // Announce the pending state rather than just looking busy.
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...rest}
    >
      {loading ? (
        <Spinner size={size === 'lg' ? 'md' : 'sm'} label={null} />
      ) : (
        iconLeft
      )}
      {children}
      {!loading && iconRight}
    </button>
  ),
);

Button.displayName = 'Button';

export default Button;

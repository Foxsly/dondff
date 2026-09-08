import React from 'react';
import { cn } from '../../lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Set by Field via aria-invalid; also accepted directly. */
  invalid?: boolean;
}

/**
 * Text input. Pair with Field for a label and validation message.
 *
 * The invalid state keys off `aria-invalid` as well as the prop, so a control
 * inside a Field turns red without the caller wiring anything up twice.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ invalid, className, ...rest }, ref) => {
    const isInvalid = invalid || rest['aria-invalid'] === true;

    return (
      <input
        ref={ref}
        className={cn(
          'w-full rounded border bg-surface-sunken px-3 py-2 text-sm text-text',
          'transition-colors duration-150',
          'placeholder:text-text-faint',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isInvalid
            ? 'border-danger focus:border-danger'
            : 'border-border hover:border-border-strong focus:border-brand',
          className,
        )}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';

export default Input;

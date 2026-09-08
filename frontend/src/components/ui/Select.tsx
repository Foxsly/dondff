import React from 'react';
import { cn } from '../../lib/cn';
import { ChevronDownIcon } from './icons';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
  /** Renders a disabled first option, so the empty state reads as a prompt. */
  placeholder?: string;
  children?: React.ReactNode;
}

/**
 * Native `<select>` with the UA arrow replaced.
 *
 * Kept native rather than rebuilt as a listbox: it gets keyboard support,
 * type-ahead and the platform picker on mobile for free, and none of the
 * selects in this app need custom option rendering. `appearance-none` plus an
 * overlaid chevron is the whole customisation.
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ invalid, placeholder, className, children, ...rest }, ref) => {
    const isInvalid = invalid || rest['aria-invalid'] === true;

    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded border bg-surface-sunken py-2 pl-3 pr-9 text-sm text-text',
            'transition-colors duration-150',
            'disabled:cursor-not-allowed disabled:opacity-50',
            isInvalid
              ? 'border-danger focus:border-danger'
              : 'border-border hover:border-border-strong focus:border-brand',
            className,
          )}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        {/* pointer-events-none so clicks fall through to the select itself. */}
        <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-subtle" />
      </div>
    );
  },
);

Select.displayName = 'Select';

export default Select;

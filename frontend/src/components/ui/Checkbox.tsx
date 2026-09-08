import React from 'react';
import { cn } from '../../lib/cn';
import { CheckIcon } from './icons';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: React.ReactNode;
  description?: string;
}

/**
 * Checkbox with a styled box.
 *
 * The real `<input>` stays in the DOM — visually hidden but not
 * `display: none` — so it keeps focus, keyboard toggling and form
 * participation. The visible box is a sibling driven by `peer-*` variants.
 * `sr-only` rather than `opacity-0` avoids a stray click target offset.
 */
export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, disabled, ...rest }, ref) => (
    <label
      className={cn(
        // Block-level (`flex`, not `inline-flex`) so a stack of checkboxes
        // responds to the parent's vertical spacing instead of flowing inline.
        // `w-fit` keeps the click target tight to the label rather than
        // spanning the full row.
        'group flex w-fit items-start gap-2.5',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        className,
      )}
    >
      <input ref={ref} type="checkbox" className="peer sr-only" disabled={disabled} {...rest} />

      <span
        aria-hidden
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150',
          'border-border-strong bg-surface-sunken',
          'peer-checked:border-brand peer-checked:bg-brand',
          // The focus ring has to live here: the input itself is sr-only, so
          // the global :focus-visible outline would be invisible.
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand',
          // The tick is a descendant of this span, not a sibling of the input,
          // so `peer-checked:` has to reach it through a child selector.
          '[&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100',
          !disabled && 'group-hover:border-brand/60',
        )}
      >
        <CheckIcon className="h-3 w-3 text-brand-contrast transition-opacity" />
      </span>

      {(label || description) && (
        <span className="min-w-0">
          {label && <span className="block text-sm text-text">{label}</span>}
          {description && <span className="block text-xs text-text-subtle">{description}</span>}
        </span>
      )}
    </label>
  ),
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;

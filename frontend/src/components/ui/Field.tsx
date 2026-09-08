import React, { useId } from 'react';
import { cn } from '../../lib/cn';

export interface FieldRenderProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
}

export interface FieldProps {
  label: string;
  /** Helper text under the control. Hidden while an error is showing. */
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  /**
   * Receives the id and ARIA attributes to spread onto the control. Using a
   * render prop rather than cloneElement keeps this type-safe and works no
   * matter how the control is wrapped.
   */
  children: (props: FieldRenderProps) => React.ReactNode;
}

/**
 * Label + control + hint/error, with the accessibility wiring done once.
 *
 * The control gets a generated id tied to the label, and `aria-describedby`
 * pointing at whichever of hint/error is currently visible, so screen readers
 * announce the validation message with the field instead of stranding it.
 *
 *   <Field label="League name" error={error}>
 *     {(field) => <Input {...field} value={name} onChange={...} />}
 *   </Field>
 */
export const Field: React.FC<FieldProps> = ({
  label,
  hint,
  error,
  required,
  className,
  children,
}) => {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-text-muted">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        )}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
      })}

      {error ? (
        // role="alert" so the message is announced the moment it appears,
        // rather than only when the field is next focused.
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-text-subtle">
          {hint}
        </p>
      ) : null}
    </div>
  );
};

export default Field;

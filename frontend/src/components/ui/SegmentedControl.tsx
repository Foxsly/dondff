import React, { useRef } from 'react';
import { cn } from '../../lib/cn';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  /** Describes the group for screen readers, e.g. "Player group". */
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/**
 * Inline single-choice control — the right shape for two or three options,
 * where a dropdown hides the alternatives behind a click.
 *
 * Implemented as an ARIA radiogroup rather than a row of buttons: the options
 * are mutually exclusive, so screen readers should announce "1 of 3" and
 * arrow keys should move between them. A roving tabindex keeps the whole group
 * to a single tab stop.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const currentIndex = options.findIndex((option) => option.value === value);

    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % options.length;
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    if (nextIndex === null) return;

    event.preventDefault();
    onChange(options[nextIndex].value);
    refs.current[nextIndex]?.focus();
  };

  // With nothing selected yet, the first option holds the tab stop so the group
  // is still reachable by keyboard.
  const focusIndex = options.findIndex((option) => option.value === value);
  const tabStopIndex = focusIndex === -1 ? 0 : focusIndex;

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKeyDown}
      className={cn(
        'inline-flex gap-1 rounded border border-border bg-surface-sunken p-1',
        fullWidth && 'flex w-full',
        className,
      )}
    >
      {options.map((option, index) => {
        const isSelected = option.value === value;

        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={index === tabStopIndex ? 0 : -1}
            onClick={() => onChange(option.value)}
            className={cn(
              'rounded-sm font-display font-semibold tracking-wide transition-colors duration-150',
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm',
              fullWidth && 'flex-1',
              isSelected
                ? 'bg-brand text-brand-contrast'
                : 'text-text-muted hover:bg-surface-raised hover:text-text',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

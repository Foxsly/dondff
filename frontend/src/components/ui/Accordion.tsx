import React, { useId, useState } from 'react';
import { cn } from '../../lib/cn';
import { ChevronDownIcon } from './icons';

export interface AccordionProps {
  title: React.ReactNode;
  /** Right-aligned in the header — status pills, dates, counts. */
  meta?: React.ReactNode;
  defaultOpen?: boolean;
  /** Controlled mode. Provide alongside onOpenChange. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Disclosure panel.
 *
 * The header is a real `<button>` with `aria-expanded`/`aria-controls`. The old
 * one was a `<div onClick>` showing a "+"/"-" character, which meant it could
 * not be reached or operated by keyboard at all.
 */
export const Accordion: React.FC<AccordionProps> = ({
  title,
  meta,
  defaultOpen = false,
  open,
  onOpenChange,
  children,
  className,
}) => {
  const id = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isOpen = open ?? internalOpen;

  const handleToggle = () => {
    const next = !isOpen;
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-border bg-surface', className)}>
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-controls={`${id}-content`}
        className={cn(
          'flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-150',
          'hover:bg-surface-raised',
          isOpen && 'bg-surface-raised',
        )}
      >
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 shrink-0 text-text-subtle transition-transform duration-200',
            // Rotating a single chevron reads as one control changing state,
            // where swapping +/- glyphs reads as two different buttons.
            isOpen && 'rotate-180',
          )}
        />

        <span className="min-w-0 flex-1 font-display font-semibold text-text-strong">{title}</span>

        {meta && <span className="flex shrink-0 items-center gap-2">{meta}</span>}
      </button>

      {isOpen && (
        <div id={`${id}-content`} className="border-t border-border px-5 py-5">
          {children}
        </div>
      )}
    </div>
  );
};

export default Accordion;

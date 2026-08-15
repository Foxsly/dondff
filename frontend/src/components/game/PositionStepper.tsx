import React from 'react';
import { cn } from '../../lib/cn';
import type { SportConfig } from '../../sports/types';
import type { LineUpSlot } from '../../types';
import { CheckIcon } from '../ui';

interface PositionStepperProps {
  lineUp: LineUpSlot[];
  currentPosition: string | null;
  sportConfig: SportConfig | null;
}

/**
 * Progress through the lineup — which position is being drafted, which are
 * done, which are still to come.
 *
 * The old screen showed only "Position: RB", so there was no way to tell how
 * many rounds were left or how far in you were.
 */
const PositionStepper: React.FC<PositionStepperProps> = ({
  lineUp,
  currentPosition,
  sportConfig,
}) => (
  <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
    {lineUp.map((slot, index) => {
      const isCurrent = slot.position === currentPosition;
      const isDone = slot.complete;
      const label = sportConfig?.getPositionDisplayName(slot.position) ?? slot.position;

      return (
        <li key={slot.position} className="flex items-center gap-2">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
              isCurrent && 'border-brand bg-brand/10',
              isDone && !isCurrent && 'border-success/40 bg-success/5',
              !isCurrent && !isDone && 'border-border bg-surface',
            )}
            aria-current={isCurrent ? 'step' : undefined}
          >
            <span
              className={cn(
                'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                isCurrent && 'bg-brand text-brand-contrast',
                isDone && !isCurrent && 'bg-success/20 text-success',
                !isCurrent && !isDone && 'bg-border text-text-subtle',
              )}
            >
              {isDone ? <CheckIcon className="h-3 w-3" /> : index + 1}
            </span>

            <span
              className={cn(
                'font-display text-sm font-semibold uppercase tracking-wide',
                isCurrent && 'text-brand',
                isDone && !isCurrent && 'text-success',
                !isCurrent && !isDone && 'text-text-subtle',
              )}
            >
              {label}
            </span>

            {/* Once a position is locked in, the player who filled it is the
                useful information — not the position name. */}
            {isDone && slot.playerName && (
              <span className="max-w-[10rem] truncate text-xs text-text-muted">
                {slot.playerName}
              </span>
            )}
          </div>

          {index < lineUp.length - 1 && (
            <span aria-hidden className="text-text-faint">
              /
            </span>
          )}
        </li>
      );
    })}
  </ol>
);

export default PositionStepper;

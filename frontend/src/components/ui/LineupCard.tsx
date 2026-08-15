import React from 'react';
import { cn } from '../../lib/cn';

export interface LineupSlot {
  /** Position key, used as the React key. */
  position: string;
  /** Display name for the position — "RB", "Golfer 1". */
  positionLabel: string;
  playerName?: string | null;
  projected?: number | null;
  actual?: number | null;
}

export interface LineupCardProps {
  /** Whose lineup this is. */
  title: string;
  /** 1-based finishing position. Omit while results are still pending. */
  rank?: number;
  slots: LineupSlot[];
  /** Reveals the Final column and the final score. */
  showFinal?: boolean;
  projectedTotal: number;
  finalScore?: number | null;
  /** `compact` drops the columns and totals — used beneath the game board. */
  variant?: 'full' | 'compact';
  /** Marks the signed-in user's own card. */
  isCurrentUser?: boolean;
  className?: string;
}

const roundToTwo = (value: number | undefined | null): string =>
  (value ? Math.round(value * 100) / 100 : 0).toFixed(2);

/**
 * A player's lineup for one event — the standings card.
 *
 * This design predates the overhaul and was kept deliberately; the surface and
 * text tokens in styles/tokens.css were derived from it rather than the other
 * way round, so moving it off its ~150 lines of inline styles onto utility
 * classes is a like-for-like swap. Anything that looks like a magic number here
 * (the 340px width, the 56px score columns) is preserved from that original on
 * purpose.
 *
 * The `compact` variant is the same component with the columns and totals
 * dropped, so the lineup strip under the game board and the standings card read
 * as one family instead of two unrelated designs.
 */
export const LineupCard: React.FC<LineupCardProps> = ({
  title,
  rank,
  slots,
  showFinal = false,
  projectedTotal,
  finalScore,
  variant = 'full',
  isCurrentUser = false,
  className,
}) => {
  const isCompact = variant === 'compact';
  const hasFinal = showFinal && typeof finalScore === 'number';

  // Podium colours for the top three; everyone else gets the neutral chip.
  const rankChip =
    rank === 1
      ? 'bg-rank-1-bg text-rank-1-text border-rank-1-border'
      : rank === 2
        ? 'bg-rank-2-bg text-rank-2-text border-rank-2-border'
        : rank === 3
          ? 'bg-rank-3-bg text-rank-3-text border-rank-3-border'
          : 'bg-border text-text-subtle border-border-strong';

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border bg-surface shadow-card',
        // Fixed at 340px as designed, but allowed to shrink below that so the
        // card still fits a narrow screen.
        isCompact ? 'w-full' : 'w-[340px] max-w-full',
        isCurrentUser ? 'border-brand/50' : 'border-border',
        className,
      )}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-b border-border bg-surface-raised',
          isCompact ? 'px-4 py-2.5' : 'px-5 py-3.5',
        )}
      >
        {rank != null && (
          <span
            className={cn(
              'flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border text-[13px] font-bold',
              rankChip,
            )}
          >
            {rank}
          </span>
        )}

        <span
          className={cn(
            'min-w-0 flex-1 truncate font-semibold -tracking-[0.01em] text-text-strong',
            isCompact ? 'text-sm' : 'text-base',
          )}
        >
          {title}
        </span>

        {isCurrentUser && <span className="shrink-0 text-label uppercase text-brand">You</span>}
      </div>

      {/* ── Column headers ─────────────────────────────────────────────── */}
      {!isCompact && (
        <div className="flex items-center px-5 pb-1 pt-2.5 text-label uppercase text-text-subtle">
          <span className="flex-1">Player</span>
          <span className="w-14 text-right">Proj</span>
          {hasFinal && <span className="w-14 text-right">Final</span>}
        </div>
      )}

      {/* ── Rows ───────────────────────────────────────────────────────── */}
      <div className={cn('flex-1', isCompact ? 'px-4 py-1' : 'px-3')}>
        {slots.map((slot, index) => (
          <div
            key={slot.position}
            className={cn(
              'flex items-center py-2.5',
              !isCompact && 'mx-2',
              index < slots.length - 1 && 'border-b border-border/50',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase leading-none tracking-[0.06em] text-text-subtle">
                {slot.positionLabel}
              </div>
              <div className="mt-[3px] truncate text-sm font-medium text-text">
                {slot.playerName ?? <span className="italic text-text-faint">---</span>}
              </div>
            </div>

            {/* A null projection means "not available" (the in-game lineup
                carries no projections), which is not the same as a real 0.00 —
                showing a zero there would read as a genuine score. */}
            <span className="tnum w-14 text-right font-mono text-sm text-text-muted">
              {slot.projected == null ? '' : roundToTwo(slot.projected)}
            </span>

            {hasFinal && !isCompact && (
              <span className="tnum w-14 text-right font-mono text-sm text-text">
                {roundToTwo(slot.actual)}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* ── Totals ─────────────────────────────────────────────────────── */}
      {!isCompact && (
        <div className="mx-5 mb-4 mt-1 flex items-end justify-between border-t border-border pt-3">
          <div>
            <div className="text-label uppercase text-text-subtle">Proj Total</div>
            <div className="tnum font-mono text-xl leading-tight text-text-muted">
              {roundToTwo(projectedTotal)}
            </div>
          </div>

          {hasFinal && (
            <div className="text-right">
              <div className="text-label uppercase text-text-subtle">Final Score</div>
              <div className="tnum font-mono text-[28px] font-bold leading-tight text-success">
                {roundToTwo(finalScore)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LineupCard;

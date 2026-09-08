import React from 'react';
import { cn } from '../../lib/cn';
import type { SportConfig } from '../../sports/types';
import type { GamePlayer } from '../../types';
import { Skeleton } from '../ui';

interface PlayerListProps {
  players: GamePlayer[] | null;
  sportConfig: SportConfig | null;
}

/**
 * The pool still in play.
 *
 * This is the information the game is actually played on — what is left tells
 * you whether the banker's offer is generous. Remaining players are sorted by
 * projection so the top of the list is the best case still on the board;
 * opened ones drop to the bottom, struck through.
 */
const PlayerList: React.FC<PlayerListProps> = ({ players, sportConfig }) => {
  if (!players) {
    return (
      <div className="space-y-2" aria-busy="true">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
    );
  }

  const isInPlay = (player: GamePlayer) =>
    player.boxStatus === 'available' || player.boxStatus === 'selected';

  const remaining = players.filter(isInPlay);
  const opened = players.filter((player) => !isInPlay(player));

  const sorted = [
    ...[...remaining].sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0)),
    ...[...opened].sort((a, b) => (b.projectedPoints ?? 0) - (a.projectedPoints ?? 0)),
  ];

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-strong">
          In play
        </h2>
        <span className="tnum font-mono text-sm text-text-muted">
          {remaining.length}/{players.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {sorted.map((player) => {
          const inPlay = isInPlay(player);

          return (
            <li
              key={player.playerId}
              className={cn(
                'flex items-center gap-3 rounded border px-3 py-2 transition-colors',
                inPlay
                  ? 'border-border bg-surface-sunken'
                  : 'border-transparent bg-surface-sunken/40',
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    inPlay ? 'text-text' : 'text-text-faint line-through',
                  )}
                >
                  {player.playerName}
                </p>
                <p className="truncate text-xs text-text-subtle">
                  {sportConfig?.renderPlayerDetails(player)}
                </p>
              </div>

              <span
                className={cn(
                  'tnum shrink-0 font-mono text-sm',
                  inPlay ? 'text-text-muted' : 'text-text-faint',
                )}
              >
                {player.projectedPoints}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PlayerList;

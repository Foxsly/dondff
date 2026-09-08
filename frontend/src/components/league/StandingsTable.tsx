import React from 'react';
import { cn } from '../../lib/cn';
import type { LineupSlot } from '../ui';

export interface StandingsRow {
  id: string;
  name: string;
  rank?: number;
  slots: LineupSlot[];
  projectedTotal: number;
  finalScore?: number | null;
  isCurrentUser?: boolean;
}

export interface StandingsTableProps {
  rows: StandingsRow[];
  positionLabels: string[];
  showFinal: boolean;
}

const roundToTwo = (value: number | undefined | null): string =>
  (value ? Math.round(value * 100) / 100 : 0).toFixed(2);

/**
 * Standings as one scannable grid.
 *
 * The cards are the better read for a single entry; this is the better read for
 * comparing eight of them, which is what a league actually does once results
 * land. Both views come off the same data.
 *
 * Wrapped in its own horizontal scroller so a wide league does not force the
 * whole page sideways.
 */
export const StandingsTable: React.FC<StandingsTableProps> = ({
  rows,
  positionLabels,
  showFinal,
}) => (
  <div className="overflow-x-auto rounded-lg border border-border">
    <table className="w-full min-w-[36rem] border-collapse text-sm">
      <thead>
        <tr className="border-b border-border bg-surface-raised text-left">
          <th scope="col" className="w-12 px-4 py-3 text-label uppercase text-text-subtle">
            #
          </th>
          <th scope="col" className="px-4 py-3 text-label uppercase text-text-subtle">
            Player
          </th>
          {positionLabels.map((label) => (
            <th
              key={label}
              scope="col"
              className="px-4 py-3 text-label uppercase text-text-subtle"
            >
              {label}
            </th>
          ))}
          <th scope="col" className="px-4 py-3 text-right text-label uppercase text-text-subtle">
            Proj
          </th>
          {showFinal && (
            <th scope="col" className="px-4 py-3 text-right text-label uppercase text-text-subtle">
              Final
            </th>
          )}
        </tr>
      </thead>

      <tbody>
        {rows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              'border-b border-border/50 last:border-b-0',
              row.isCurrentUser ? 'bg-brand/5' : 'hover:bg-surface-raised/50',
            )}
          >
            <td className="tnum px-4 py-3 font-mono text-text-subtle">{row.rank ?? '—'}</td>

            <td className="px-4 py-3">
              <span className="font-medium text-text-strong">{row.name}</span>
              {row.isCurrentUser && (
                <span className="ml-1.5 text-label uppercase text-brand">You</span>
              )}
            </td>

            {row.slots.map((slot) => (
              <td key={slot.position} className="px-4 py-3">
                <span className="text-text">
                  {slot.playerName ?? <span className="italic text-text-faint">---</span>}
                </span>
              </td>
            ))}

            <td className="tnum px-4 py-3 text-right font-mono text-text-muted">
              {roundToTwo(row.projectedTotal)}
            </td>

            {showFinal && (
              <td className="tnum px-4 py-3 text-right font-mono font-bold text-success">
                {typeof row.finalScore === 'number' ? roundToTwo(row.finalScore) : '—'}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StandingsTable;

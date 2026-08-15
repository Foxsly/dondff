import React from 'react';
import type { SportConfig } from '../../sports/types';
import type { LineUpSlot } from '../../types';
import { LineupCard as LineupCardPrimitive } from '../ui';

interface LineupCardProps {
  playerName: string | null;
  lineUp: LineUpSlot[];
  sportConfig: SportConfig | null;
}

/**
 * The lineup strip under the game board.
 *
 * A compact rendering of the same component the standings use, so a lineup
 * looks the same whether you are drafting it or comparing it afterwards. The
 * in-game data carries no projections, so those columns come through empty and
 * the compact variant leaves the totals off.
 */
const LineupCard: React.FC<LineupCardProps> = ({ playerName, lineUp, sportConfig }) => (
  <div className="mx-auto w-full max-w-md">
    <LineupCardPrimitive
      variant="compact"
      title={playerName ?? 'Your lineup'}
      projectedTotal={0}
      slots={lineUp.map((slot) => ({
        position: slot.position,
        positionLabel: sportConfig?.getPositionDisplayName(slot.position) ?? slot.position,
        playerName: slot.playerName,
        projected: null,
      }))}
    />
  </div>
);

export default LineupCard;

import React from 'react';
import type { LineUpSlot } from '../../types';
import type { SportConfig } from '../../sports/types';

interface LineupCardProps {
  playerName: string | null;
  lineUp: LineUpSlot[];
  sportConfig: SportConfig | null;
}

const LineupCard: React.FC<LineupCardProps> = ({ playerName, lineUp, sportConfig }) => (
  <div className="contestant-flexbox">
    <div className="contestant-card">
      <p>{playerName}</p>
      {lineUp.map((slot, index) => (
        <p key={index}>
          <b>{sportConfig?.getPositionDisplayName(slot.position) ?? slot.position}:</b> {slot.playerName}
        </p>
      ))}
    </div>
  </div>
);

export default LineupCard;

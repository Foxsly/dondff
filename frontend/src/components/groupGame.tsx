import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TeamUser } from '../types';
import Game from './game/Game';
import { Badge } from './ui';

interface GroupGameLocationState {
  participants: TeamUser[];
}

/**
 * Runs each selected player's game in turn on one device.
 *
 * Adds a "player 2 of 5" banner — passing a laptop around a room with no
 * indication of whose turn it is or how many are left is how the old version
 * worked.
 */
const GroupGame: React.FC = () => {
  const navigate = useNavigate();
  const { participants } = useLocation().state as GroupGameLocationState;
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleComplete = () => {
    if (currentIndex < participants.length - 1) {
      setCurrentIndex((index) => index + 1);
    } else {
      navigate(-1);
    }
  };

  const current = participants[currentIndex];

  return (
    <>
      <div className="border-b border-border bg-surface-raised">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <Badge variant="brand">
            Player {currentIndex + 1} of {participants.length}
          </Badge>
          <p className="min-w-0 truncate text-sm text-text-muted">
            Hand the device to{' '}
            <span className="font-medium text-text">
              {current.user.name || current.user.email}
            </span>
          </p>
        </div>
      </div>

      <Game key={current.user.userId} teamUser={current} onComplete={handleComplete} />
    </>
  );
};

export default GroupGame;

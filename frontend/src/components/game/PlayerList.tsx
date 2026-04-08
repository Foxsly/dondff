import React from 'react';
import type {SportConfig} from '../../sports/types';
import type {GamePlayer} from '../../types';

interface PlayerListProps {
  players: GamePlayer[] | null;
  sportConfig: SportConfig | null;
}

const PlayerList: React.FC<PlayerListProps> = ({ players, sportConfig }) => {
  if (!players) return null;

  return (
    <div className="display-cases">
      Players in cases:
      {players.map((player) =>
        player.boxStatus === 'available' || player.boxStatus === 'selected' ? (
          <div className="list-player" key={player.playerId}>
            {player.playerName}<br />
            {sportConfig?.renderPlayerDetails(player)}
          </div>
        ) : (
          <div className="list-player eliminated" key={player.playerId}>
            {player.playerName} <span className="status">{player.boxStatus}</span><br />
            {sportConfig?.renderPlayerDetails(player)}
          </div>
        )
      )}
    </div>
  );
};

export default PlayerList;

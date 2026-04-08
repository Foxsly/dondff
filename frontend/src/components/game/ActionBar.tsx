import React from 'react';
import type {GameBox, GameOffer} from '../../types';

interface ActionBarProps {
  offer: GameOffer | null;
  caseSelected: GameBox | null;
  allPositionsDone: boolean;
  onReset: () => void;
  resetDisabled: boolean;
  onAdvance: () => void;
  onSubmit: () => void;
}

const ActionBar: React.FC<ActionBarProps> = ({
  offer, caseSelected, allPositionsDone, onReset, resetDisabled, onAdvance, onSubmit,
}) => {
  if (offer && offer.status === 'accepted') {
    return (
      <div className="action-box">
        <div className="offer-box">
          <p>You accepted the Banker's offer.</p>
          <p>Congratulations!! Your player is {offer.playerName}. Their projected points are {offer.projectedPoints}</p>
        </div>
        <div className="action-buttons">
          {allPositionsDone
            ? <button className="btn" onClick={onSubmit}>Submit Lineup</button>
            : <button className="btn" onClick={onAdvance}>Switch Position Group</button>
          }
        </div>
      </div>
    );
  }

  if (caseSelected && caseSelected.playerName) {
    return (
      <div className="action-box">
        <div className="offer-box">
          <p>Your Final case is case #{caseSelected.boxNumber}</p>
          <p>Congratulations!! Your player is {caseSelected.playerName}. Their projected points are {caseSelected.projectedPoints}</p>
        </div>
        <div className="action-buttons">
          {allPositionsDone
            ? <button className="btn" onClick={onSubmit}>Submit Lineup</button>
            : <button className="btn" onClick={onAdvance}>Switch Position Group</button>
          }
        </div>
      </div>
    );
  }

  return (
    <div className="action-buttons">
      <button className="btn" onClick={onReset} disabled={resetDisabled}>Reset</button>
      {allPositionsDone
        ? <button className="btn" onClick={onSubmit}>Submit Lineup</button>
        : <button className="btn" onClick={onAdvance}>Switch Position Group</button>
      }
    </div>
  );
};

export default ActionBar;

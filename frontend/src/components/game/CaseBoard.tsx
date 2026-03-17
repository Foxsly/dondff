import React from 'react';
import type { GameBox, GamePlayer } from '../../types';

interface CaseBoardProps {
  cases: GameBox[] | null;
  caseSelected: GameBox | null;
  players: GamePlayer[] | null;
  onSelectCase: (box: GameBox) => void;
}

const CaseBoard: React.FC<CaseBoardProps> = ({ cases, caseSelected, players, onSelectCase }) => {
  const showAllCases = players && players.filter((p) => p.boxStatus === 'available').length === 0;

  if (cases && caseSelected) {
    return (
      <div className="board">
        {cases.map((box) =>
          (box.boxStatus === 'available' || box.boxStatus === 'selected') && !showAllCases ? (
            <div className="box" key={box.boxNumber}>
              <span className="num">{box.boxNumber}</span>
            </div>
          ) : (
            <div className="box opened" key={box.boxNumber}>
              {box.boxNumber}<br />
              {box.playerName}({box.projectedPoints})
            </div>
          )
        )}
      </div>
    );
  }

  if (cases) {
    return (
      <div className="board">
        {cases.map((box) =>
          <div className="box" key={box.boxNumber} onClick={() => onSelectCase(box)}>
            <span className="num">{box.boxNumber}</span>
          </div>
        )}
      </div>
    );
  }

  return <div className="board" />;
};

export default CaseBoard;

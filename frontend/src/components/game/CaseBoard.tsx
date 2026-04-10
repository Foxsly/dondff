import React from 'react';
import type {GameBox, GamePlayer} from '../../types';
import Briefcase from './Briefcase';

interface CaseBoardProps {
  cases: GameBox[] | null;
  caseSelected: GameBox | null;
  players: GamePlayer[] | null;
  onSelectCase: (box: GameBox) => void;
}

const CaseBoard: React.FC<CaseBoardProps> = ({ cases, caseSelected, players, onSelectCase }) => {
  if (!cases) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-slate/50 rounded-lg min-h-[200px]" />;
  }

  const showAllRevealed = players && players.filter((p) => p.boxStatus === 'available').length === 0;

  // The game is finished when all players are revealed AND an offer was accepted or final decision made
  // Detect the final winning case: it's the user's selected case when all are revealed
  const isGameFinished = !!showAllRevealed && !!caseSelected?.playerName;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-6 bg-slate/50 rounded-lg">
      {cases.map((box) => {
        const isUserSelected = caseSelected?.boxNumber === box.boxNumber;
        const isFinalWinner = isGameFinished && isUserSelected;
        const isOpened =
          (box.boxStatus === 'eliminated' || box.boxStatus === 'swapped') || !!showAllRevealed;
        const isClickable = !caseSelected && box.boxStatus === 'available';

        const displayBox = isOpened
          ? { ...box, boxStatus: 'eliminated' as string }
          : box;

        return (
          <Briefcase
            key={box.boxNumber}
            box={displayBox}
            isUserSelected={isUserSelected}
            isFinalWinner={isFinalWinner}
            isClickable={isClickable}
            onClick={isClickable ? () => onSelectCase(box) : undefined}
          />
        );
      })}
    </div>
  );
};

export default CaseBoard;

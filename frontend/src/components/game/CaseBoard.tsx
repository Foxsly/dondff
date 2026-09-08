import React from 'react';
import { cn } from '../../lib/cn';
import type { GameBox, GamePlayer } from '../../types';
import Briefcase from './Briefcase';

interface CaseBoardProps {
  cases: GameBox[] | null;
  caseSelected: GameBox | null;
  players: GamePlayer[] | null;
  onSelectCase: (box: GameBox) => void;
}

/**
 * The board of briefcases.
 *
 * Briefcase itself is untouched — it is the part of the old UI the design is
 * being kept from. Everything here is layout and interaction around it.
 *
 * Each case is wrapped in a real <button> rather than Briefcase handling its
 * own click, which is what makes the board keyboard-operable: the old board
 * was a grid of <div onClick>, unreachable by Tab and unusable without a
 * mouse. The wrapper is styled to nothing so the case art is unchanged.
 */
const CaseBoard: React.FC<CaseBoardProps> = ({ cases, caseSelected, players, onSelectCase }) => {
  const gridClass =
    'grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 justify-items-center';

  if (!cases) {
    return (
      <div
        className={cn(gridClass, 'min-h-[16rem] rounded-xl border border-border bg-surface/40 p-6')}
        aria-busy="true"
      />
    );
  }

  const allRevealed = players != null && players.every((player) => player.boxStatus !== 'available');
  const isGameFinished = allRevealed && !!caseSelected?.playerName;

  return (
    <div
      className={cn(gridClass, 'rounded-xl border border-border bg-surface/40 p-5 sm:p-6')}
      role="group"
      aria-label="Case board"
    >
      {cases.map((box) => {
        const isUserSelected = caseSelected?.boxNumber === box.boxNumber;
        const isFinalWinner = isGameFinished && isUserSelected;
        const isOpened =
          box.boxStatus === 'eliminated' || box.boxStatus === 'swapped' || allRevealed;
        const isClickable = !caseSelected && box.boxStatus === 'available';

        const displayBox = isOpened ? { ...box, boxStatus: 'eliminated' as string } : box;

        return (
          <button
            key={box.boxNumber}
            type="button"
            disabled={!isClickable}
            onClick={isClickable ? () => onSelectCase(box) : undefined}
            aria-label={
              isOpened && box.playerName
                ? `Case ${box.boxNumber}, opened: ${box.playerName}, ${box.projectedPoints} points`
                : isUserSelected
                  ? `Case ${box.boxNumber}, your case`
                  : `Case ${box.boxNumber}${isClickable ? '' : ', unavailable'}`
            }
            className="rounded-md disabled:cursor-default"
          >
            <Briefcase
              box={displayBox}
              isUserSelected={isUserSelected}
              isFinalWinner={isFinalWinner}
              isClickable={isClickable}
            />
          </button>
        );
      })}
    </div>
  );
};

export default CaseBoard;

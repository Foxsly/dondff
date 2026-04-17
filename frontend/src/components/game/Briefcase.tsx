import React from 'react';
import type { GameBox } from '../../types';

interface BriefcaseProps {
  box: GameBox;
  isUserSelected: boolean;
  isFinalWinner?: boolean;
  isClickable: boolean;
  onClick?: () => void;
}

const Briefcase: React.FC<BriefcaseProps> = ({ box, isUserSelected, isFinalWinner, isClickable, onClick }) => {
  const isOpened = box.boxStatus === 'eliminated' || box.boxStatus === 'swapped';

  return (
    <div
      className={`
        relative flex flex-col items-center
        ${isClickable ? 'cursor-pointer hover:scale-105 transition-transform duration-200' : ''}
        ${isOpened && !isFinalWinner ? 'opacity-40' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      {isUserSelected && (
        <span className={`absolute -top-4 left-1/2 -translate-x-1/2 text-[0.65rem] font-bold px-2 py-0.5 rounded-full whitespace-nowrap z-20 ${
          isFinalWinner ? 'bg-yellow-400 text-navy' : 'bg-teal text-navy'
        }`}>
          {isFinalWinner ? 'YOUR PLAYER' : 'YOUR CASE'}
        </span>
      )}

      {/* Handle */}
      <div className={`
        w-10 h-3 rounded-t-md mx-auto -mb-px relative z-10
        ${isOpened ? 'bg-amber-800/50' : 'bg-amber-700 border-b border-amber-900'}
      `} />

      {/* Case body wrapper with perspective for lid animation */}
      <div
        className={`relative ${isFinalWinner ? 'animate-spotlight rounded-md' : isUserSelected ? 'animate-glow-pulse rounded-md' : ''}`}
        style={{ perspective: '600px' }}
      >
        {isOpened && (
          <>
            {/* Lid */}
            <div
              className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-amber-600 to-amber-700 border-2 border-amber-900 rounded-t-md z-10 origin-top animate-lid-open"
            >
              <div className="flex justify-center items-center h-full gap-4">
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-300/60" />
                <div className="w-1.5 h-1.5 rounded-full bg-yellow-300/60" />
              </div>
            </div>

            {/* Interior with player info */}
            <div className="w-40 h-32 rounded-md bg-gradient-to-b from-amber-600 to-amber-800 border-2 border-amber-900 flex items-center justify-center overflow-hidden">
              <div className="opacity-0 animate-reveal-content bg-amber-100/90 rounded px-2 py-1.5 text-center mx-1">
                <div className="text-navy text-sm font-bold leading-tight truncate max-w-[8.5rem]">
                  {box.playerName}
                </div>
                <div className="text-navy/70 text-xs mt-0.5">
                  {box.projectedPoints} pts
                </div>
              </div>
            </div>
          </>
        )}

        {!isOpened && (
          <div className={`
            w-40 h-32 rounded-md border-2
            bg-gradient-to-b from-amber-600 to-amber-800 border-amber-900
            flex flex-col items-center justify-center gap-2
            ${isClickable ? 'hover:from-amber-500 hover:to-amber-700 hover:shadow-lg' : ''}
            transition-all duration-200
          `}>
            {/* Clasps */}
            <div className="flex gap-4">
              <div className="w-2 h-2 rounded-full bg-yellow-300 shadow-sm" />
              <div className="w-2 h-2 rounded-full bg-yellow-300 shadow-sm" />
            </div>

            {/* Number plate */}
            <div className="bg-yellow-200/90 text-navy font-bold text-2xl px-4 py-1 rounded-sm shadow-inner">
              {box.boxNumber}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Briefcase;

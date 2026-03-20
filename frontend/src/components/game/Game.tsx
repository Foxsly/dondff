import React from 'react';
import {useLocation, useNavigate} from 'react-router-dom';
import type {TeamUser} from '../../types';
import ErrorDisplay from '../ui/ErrorDisplay';
import ActionBar from './ActionBar';
import CaseBoard from './CaseBoard';
import FinalDecision from './FinalDecision';
import LineupCard from './LineupCard';
import OfferPanel from './OfferPanel';
import PlayerList from './PlayerList';
import {useGameState} from './useGameState';

interface GameLocationState {
  leagueId: string;
  season: string | number;
  week: string | number;
}

interface GameProps {
  teamUser?: TeamUser;
  onComplete?: () => void;
}

const Game: React.FC<GameProps> = ({ teamUser, onComplete }) => {
  const { leagueId, season, week } = useLocation().state as GameLocationState;
  const navigate = useNavigate();

  const {
    currentName, cases, players, offer, caseSelected, position,
    lineUp, resetUsed, sportConfig, error, allPositionsDone, isKeepOrSwap,
    selectCase, acceptOffer, declineOffer, keep, swap, resetGame, advanceToNextPosition,
  } = useGameState({ leagueId, season, week, teamUser });

  const handleSubmit = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate(-1);
    }
  };

  const resetDisabled = !!caseSelected || (position ? resetUsed[position] : true);

  const remainingCase = cases && caseSelected
    ? cases.find((c) => c.boxStatus === 'available' && c.boxNumber !== caseSelected.boxNumber)
    : undefined;

  if (error) {
    return (
      <div className="p-4">
        <ErrorDisplay message={error} />
      </div>
    );
  }

  const renderActions = () => {
    if (offer && offer.status === 'pending' && !isKeepOrSwap) {
      return (
        <OfferPanel
          offer={offer}
          sportConfig={sportConfig}
          onAccept={acceptOffer}
          onDecline={declineOffer}
        />
      );
    }

    if (offer && isKeepOrSwap) {
      return (
        <FinalDecision
          remainingCase={remainingCase}
          onKeep={keep}
          onSwap={swap}
        />
      );
    }

    return (
      <ActionBar
        offer={offer}
        caseSelected={caseSelected}
        allPositionsDone={allPositionsDone}
        onReset={resetGame}
        resetDisabled={resetDisabled}
        onAdvance={advanceToNextPosition}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <>
      <h3>Current User: {currentName}</h3>
      {position && <h4>Position: {sportConfig?.getPositionDisplayName(position) ?? position}</h4>}
      <div className="game">
        <CaseBoard
          cases={cases}
          caseSelected={caseSelected}
          players={players}
          onSelectCase={selectCase}
        />
        <div className="side">
          {!caseSelected ? (
            <>
              <div>To begin select a case.</div>
            </>
          ) : (
            <>
              <div className="case-selected-text">You have selected case #{caseSelected.boxNumber}</div>
            </>
          )}
          <PlayerList players={players} sportConfig={sportConfig} />
          {renderActions()}
        </div>
      </div>
      <LineupCard playerName={currentName} lineUp={lineUp} sportConfig={sportConfig} />
    </>
  );
};

export default Game;

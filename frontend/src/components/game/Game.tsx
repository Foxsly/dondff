import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { TeamUser } from '../../types';
import { ErrorDisplay, PageContainer, useToast } from '../ui';
import ActionBar from './ActionBar';
import CaseBoard from './CaseBoard';
import FinalDecision from './FinalDecision';
import LineupCard from './LineupCard';
import OfferPanel from './OfferPanel';
import PlayerList from './PlayerList';
import PositionStepper from './PositionStepper';
import { useGameState } from './useGameState';

interface GameLocationState {
  leagueId: string;
  season: string | number;
  eventGroupId: string;
}

interface GameProps {
  teamUser?: TeamUser;
  onComplete?: () => void;
}

const Game: React.FC<GameProps> = ({ teamUser, onComplete }) => {
  const { leagueId, season, eventGroupId } = useLocation().state as GameLocationState;
  const navigate = useNavigate();
  const { error: errorToast } = useToast();

  const [busy, setBusy] = useState(false);

  const {
    currentName, cases, players, offer, caseSelected, position,
    lineUp, resetUsed, sportConfig, error, allPositionsDone, isKeepOrSwap,
    selectCase, acceptOffer, declineOffer, keep, swap, resetGame, advanceToNextPosition,
  } = useGameState({ leagueId, season, eventGroupId, teamUser });

  /**
   * Every action here is a server round trip that the old screen fired and
   * forgot: none of them were awaited or caught, so a failed request left the
   * board silently out of step with the backend. Wrapping them gives the user
   * an error and blocks double-submits while one is in flight.
   */
  const run = (action: () => void | Promise<void>) => async () => {
    if (busy) return;
    setBusy(true);
    try {
      await action();
    } catch (err: any) {
      console.error('Game action failed', err);
      errorToast(err?.message ?? 'That didn\'t go through. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    if (onComplete) {
      onComplete();
    } else {
      navigate(-1);
    }
  };

  if (error) {
    return (
      <PageContainer width="wide">
        <ErrorDisplay
          message={error}
          action={{ label: 'Go back', onClick: () => navigate(-1) }}
        />
      </PageContainer>
    );
  }

  const resetDisabled = !!caseSelected || (position ? resetUsed[position] : true);

  const remainingCase =
    cases && caseSelected
      ? cases.find(
          (box) => box.boxStatus === 'available' && box.boxNumber !== caseSelected.boxNumber,
        )
      : undefined;

  const renderDecision = () => {
    if (offer && offer.status === 'pending' && !isKeepOrSwap) {
      return (
        <OfferPanel
          offer={offer}
          sportConfig={sportConfig}
          busy={busy}
          onAccept={run(acceptOffer)}
          onDecline={run(declineOffer)}
        />
      );
    }

    if (offer && isKeepOrSwap) {
      return (
        <FinalDecision
          remainingCase={remainingCase}
          yourCase={caseSelected}
          busy={busy}
          onKeep={run(keep)}
          onSwap={run(swap)}
        />
      );
    }

    return (
      <ActionBar
        offer={offer}
        caseSelected={caseSelected}
        allPositionsDone={allPositionsDone}
        busy={busy}
        onReset={run(resetGame)}
        resetDisabled={resetDisabled}
        onAdvance={run(advanceToNextPosition)}
        onSubmit={handleSubmit}
      />
    );
  };

  return (
    <PageContainer width="wide">
      {/* ── Stage header ─────────────────────────────────────────────────── */}
      <header className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-label uppercase text-text-subtle">Drafting for</p>
          <h1 className="mt-1 truncate font-display text-2xl font-bold text-text-strong">
            {currentName ?? 'Your lineup'}
          </h1>
        </div>

        <PositionStepper lineUp={lineUp} currentPosition={position} sportConfig={sportConfig} />
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ── Board and decision ─────────────────────────────────────────── */}
        <div className="min-w-0 space-y-5">
          <p
            className="text-center text-sm text-text-muted"
            role="status"
            aria-live="polite"
          >
            {caseSelected
              ? `You're holding case #${caseSelected.boxNumber}`
              : 'Pick a case to start.'}
          </p>

          <CaseBoard
            cases={cases}
            caseSelected={caseSelected}
            players={players}
            onSelectCase={(box) => run(() => selectCase(box))()}
          />

          {renderDecision()}
        </div>

        {/* ── Pool rail ──────────────────────────────────────────────────── */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PlayerList players={players} sportConfig={sportConfig} />
        </aside>
      </div>

      {/* ── Lineup so far ────────────────────────────────────────────────── */}
      <div className="mt-8 border-t border-border pt-6">
        <LineupCard playerName={currentName} lineUp={lineUp} sportConfig={sportConfig} />
      </div>
    </PageContainer>
  );
};

export default Game;

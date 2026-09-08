import React from 'react';
import type { GameBox, GameOffer } from '../../types';
import { Button } from '../ui';

interface ActionBarProps {
  offer: GameOffer | null;
  caseSelected: GameBox | null;
  allPositionsDone: boolean;
  busy?: boolean;
  onReset: () => void;
  resetDisabled: boolean;
  onAdvance: () => void;
  onSubmit: () => void;
}

/** The player locked in for this position, whichever way they got there. */
const Result: React.FC<{ heading: string; playerName?: string; points?: number }> = ({
  heading,
  playerName,
  points,
}) => (
  <div className="px-5 py-6 text-center">
    <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-success">
      {heading}
    </p>
    <p className="mt-3 font-display text-2xl font-bold leading-tight text-text-strong sm:text-3xl">
      {playerName}
    </p>
    {points != null && (
      <p className="tnum mt-1 font-mono text-sm text-text-muted">{points} projected points</p>
    )}
  </div>
);

const ActionBar: React.FC<ActionBarProps> = ({
  offer,
  caseSelected,
  allPositionsDone,
  busy,
  onReset,
  resetDisabled,
  onAdvance,
  onSubmit,
}) => {
  const next = allPositionsDone ? (
    <Button size="lg" fullWidth loading={busy} onClick={onSubmit}>
      Submit lineup
    </Button>
  ) : (
    <Button size="lg" fullWidth loading={busy} onClick={onAdvance}>
      Next position
    </Button>
  );

  // Offer accepted — the banker's player is yours.
  if (offer && offer.status === 'accepted') {
    return (
      <section className="overflow-hidden rounded-xl border border-success/40 bg-surface shadow-lg">
        <Result
          heading="Deal — you took the offer"
          playerName={offer.playerName}
          points={offer.projectedPoints}
        />
        <div className="border-t border-border px-5 py-4">{next}</div>
      </section>
    );
  }

  // Played to the end — whatever was in the final case.
  if (caseSelected && caseSelected.playerName) {
    return (
      <section className="overflow-hidden rounded-xl border border-success/40 bg-surface shadow-lg">
        <Result
          heading={`Case #${caseSelected.boxNumber} was yours`}
          playerName={caseSelected.playerName}
          points={caseSelected.projectedPoints}
        />
        <div className="border-t border-border px-5 py-4">{next}</div>
      </section>
    );
  }

  // Mid-round: nothing to decide yet.
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        disabled={resetDisabled || busy}
        onClick={onReset}
        title={resetDisabled ? 'One reset per position, before you pick a case' : undefined}
      >
        Reset board
      </Button>
      {next}
    </div>
  );
};

export default ActionBar;

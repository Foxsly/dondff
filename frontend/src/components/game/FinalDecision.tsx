import React from 'react';
import type { GameBox } from '../../types';
import { Button } from '../ui';

interface FinalDecisionProps {
  remainingCase: GameBox | undefined;
  yourCase: GameBox | null;
  busy?: boolean;
  onKeep: () => void;
  onSwap: () => void;
}

/**
 * The last call: keep your case, or swap it for the one still standing.
 *
 * Both cases are shown as equal options rather than described in a sentence,
 * so the choice reads as a choice.
 */
const FinalDecision: React.FC<FinalDecisionProps> = ({
  remainingCase,
  yourCase,
  busy,
  onKeep,
  onSwap,
}) => (
  <section
    aria-label="Final decision"
    className="overflow-hidden rounded-xl border border-brand/40 bg-surface shadow-lg"
  >
    <div className="border-b border-brand/25 bg-brand/10 px-5 py-2.5 text-center">
      <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand">
        Two cases left
      </h2>
    </div>

    <div className="px-5 py-5 text-center">
      <p className="text-sm text-text-muted">
        You turned down every offer. Keep the case you picked, or trade it for the last one on
        the board.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface-sunken p-4">
          <p className="text-label uppercase text-text-subtle">Your case</p>
          <p className="mt-1 font-display text-3xl font-bold text-text-strong">
            #{yourCase?.boxNumber ?? '—'}
          </p>
          <Button className="mt-4" fullWidth loading={busy} onClick={onKeep}>
            Keep it
          </Button>
        </div>

        <div className="rounded-lg border border-border bg-surface-sunken p-4">
          <p className="text-label uppercase text-text-subtle">Last case</p>
          <p className="mt-1 font-display text-3xl font-bold text-text-strong">
            #{remainingCase?.boxNumber ?? '—'}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            fullWidth
            disabled={busy}
            onClick={onSwap}
          >
            Swap for it
          </Button>
        </div>
      </div>
    </div>
  </section>
);

export default FinalDecision;

import React, { useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjections } from '../../api/players';
import { AuthContext } from '../../contexts/AuthContext';
import type { SportConfig } from '../../sports/types';
import type { GamePlayer } from '../../types';
import { Alert, Button, PageContainer, buttonVariants } from '../ui';
import CaseBoard from './CaseBoard';
import FinalDecision from './FinalDecision';
import OfferPanel from './OfferPanel';
import PlayerList from './PlayerList';
import {
  CASE_COUNT,
  createQuickPlayReducer,
  lastCaseStanding,
  phaseOf,
  railPlayers,
  visibleBoxes,
  yourCase,
} from './quickPlay';

export interface QuickPlayGameProps {
  sportConfig: SportConfig;
  position: string;
  season: string;
  eventGroupId: string;
  /** Human label for the week the projections came from, e.g. "Week 1". */
  weekLabel: string;
  onExit: () => void;
}

/**
 * Turn a projections row into the player shape the game components speak.
 *
 * Rows without a usable projection are dropped rather than defaulted to zero:
 * a NaN or a missing number would propagate through the banker's quadratic mean
 * and come back out as an offer, and a zero-point placeholder would quietly
 * become the best-value case on the board.
 */
const toGamePlayer = (row: any): GamePlayer | null => {
  const projectedPoints = Number(row?.projectedPoints);
  if (!row?.playerId || !row?.name || !Number.isFinite(projectedPoints)) return null;

  return {
    playerId: String(row.playerId),
    playerName: row.name,
    projectedPoints,
    injuryStatus: row.injuryStatus ?? undefined,
    boxStatus: 'available',
    matchup: { team: row.team, opponent: row.oppTeam },
  };
};

/**
 * The home page's demo board.
 *
 * A thin renderer over the `quickPlay` reducer, built from the same components
 * as the league game — `CaseBoard`, `PlayerList`, `OfferPanel`,
 * `FinalDecision` — so what a visitor plays here looks and behaves like what
 * they get after signing up. The previous board reimplemented all four inline
 * and drifted from them.
 */
const QuickPlayGame: React.FC<QuickPlayGameProps> = ({
  sportConfig,
  position,
  season,
  eventGroupId,
  weekLabel,
  onExit,
}) => {
  const { user } = useContext(AuthContext);

  // One RNG-bound reducer for the life of the component. `dispatch` is stable,
  // so nothing below needs a dependency on it.
  const reducer = useMemo(() => createQuickPlayReducer(), []);
  const [state, dispatch] = useReducer(reducer, null);

  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');

    (async () => {
      try {
        const poolSize = sportConfig.quickPlayPoolSizes?.[position] ?? 64;
        const rows = await getProjections(season, eventGroupId, position, sportConfig.key);
        if (cancelled) return;

        const pool = (Array.isArray(rows) ? rows : [])
          .map(toGamePlayer)
          .filter((player): player is GamePlayer => player !== null)
          .slice(0, poolSize);

        if (pool.length < CASE_COUNT) {
          setError(
            `Only ${pool.length} ${position} projections are published for ${weekLabel.toLowerCase()} so far — a board needs ${CASE_COUNT}.`,
          );
          return;
        }

        dispatch({ type: 'deal', pool });
      } catch (err: any) {
        if (cancelled) return;
        console.error('Failed to build a quick-play board', err);
        setError(err?.message ?? 'Something went wrong building the board.');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sportConfig, position, season, eventGroupId, weekLabel, attempt]);

  const heading = (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div>
        <p className="text-label uppercase text-text-subtle">Quick play</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-text-strong">
          Ten cases, one {sportConfig.getPositionDisplayName(position)}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {weekLabel} projections. Nothing here is saved.
        </p>
      </div>

      <Button variant="ghost" onClick={onExit}>
        Leave board
      </Button>
    </header>
  );

  if (error) {
    return (
      <PageContainer width="wide">
        {heading}
        <Alert variant="danger" title="No board to deal">
          {error}
        </Alert>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
          <Button variant="secondary" onClick={onExit}>
            Pick a different group
          </Button>
        </div>
      </PageContainer>
    );
  }

  const phase = state ? phaseOf(state) : 'choosing';

  const status = !state
    ? 'Dealing the board...'
    : phase === 'choosing'
      ? 'Pick a case to start.'
      : phase === 'revealed'
        ? 'Board complete.'
        : `You're holding case #${state.selectedBoxNumber}`;

  /** What was actually in the case you were holding, once the board is open. */
  const heldCase =
    state?.outcome && state.selectedBoxNumber !== null
      ? state.boxes.find((box) => box.boxNumber === state.selectedBoxNumber)
      : undefined;

  const renderActions = () => {
    if (!state) return null;

    if (phase === 'offer' && state.offer) {
      return (
        <OfferPanel
          offer={state.offer}
          sportConfig={sportConfig}
          onAccept={() => dispatch({ type: 'acceptOffer' })}
          onDecline={() => dispatch({ type: 'declineOffer' })}
        />
      );
    }

    if (phase === 'final') {
      return (
        <FinalDecision
          remainingCase={lastCaseStanding(state)}
          yourCase={yourCase(state)}
          onKeep={() => dispatch({ type: 'keep' })}
          onSwap={() => dispatch({ type: 'swap' })}
        />
      );
    }

    if (phase === 'revealed' && state.outcome) {
      const { outcome } = state;
      const tookTheDeal = outcome.kind === 'deal';

      return (
        <section className="overflow-hidden rounded-xl border border-success/40 bg-surface shadow-lg">
          <div className="px-5 py-6 text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-success">
              {tookTheDeal
                ? 'Deal — you took the offer'
                : outcome.swapped
                  ? `You swapped into case #${outcome.boxNumber}`
                  : `Case #${outcome.boxNumber} was yours`}
            </p>

            <p className="mt-3 font-display text-2xl font-bold leading-tight text-text-strong sm:text-3xl">
              {outcome.playerName}
            </p>
            <p className="tnum mt-1 font-mono text-sm text-text-muted">
              {outcome.projectedPoints} projected points
            </p>

            {tookTheDeal && heldCase && (
              <p className="mt-4 border-t border-border pt-4 text-sm text-text-subtle">
                Case #{heldCase.boxNumber} was holding{' '}
                <span className="font-medium text-text-muted">{heldCase.playerName}</span>
                <span className="tnum font-mono"> ({heldCase.projectedPoints})</span>.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row">
            <Button size="lg" fullWidth onClick={() => dispatch({ type: 'redeal' })}>
              Play another board
            </Button>
            {user ? (
              <Link
                to="/dashboard"
                className={buttonVariants({ variant: 'outline', size: 'lg', fullWidth: true })}
              >
                Go to your leagues
              </Link>
            ) : (
              <Link
                to="/login"
                className={buttonVariants({ variant: 'outline', size: 'lg', fullWidth: true })}
              >
                Play for real
              </Link>
            )}
          </div>
        </section>
      );
    }

    // Still choosing. Re-dealing is free here because nothing is at stake — the
    // league game allows one reset per position, and only before a pick.
    return (
      <Button
        variant="secondary"
        size="lg"
        fullWidth
        onClick={() => dispatch({ type: 'redeal' })}
      >
        Deal a new board
      </Button>
    );
  };

  return (
    <PageContainer width="wide">
      {heading}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <p className="text-center text-sm text-text-muted" role="status" aria-live="polite">
            {status}
          </p>

          <CaseBoard
            cases={state ? visibleBoxes(state) : null}
            caseSelected={state ? yourCase(state) : null}
            players={state ? railPlayers(state) : null}
            onSelectCase={(box) => dispatch({ type: 'selectCase', boxNumber: box.boxNumber })}
          />

          {renderActions()}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <PlayerList players={state ? railPlayers(state) : null} sportConfig={sportConfig} />
        </aside>
      </div>
    </PageContainer>
  );
};

export default QuickPlayGame;

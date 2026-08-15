import React, { useEffect, useState, useCallback } from 'react';
import { generateCases } from './util';
import type { PoolPlayer, GameCase, GameBox } from '../types';
import Briefcase from './game/Briefcase';
import { Button, PageContainer } from './ui';

interface DisplayGameProps {
  pool: PoolPlayer[];
}

const DisplayGame: React.FC<DisplayGameProps> = ({ pool }) => {
  const [cases, setCases] = useState<GameCase[] | null>(null);
  const [caseSelected, setCaseSelected] = useState<GameCase | null>(null);
  const [gameCases, setGameCases] = useState<GameCase[] | null>(null);
  const [round, setRound] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [removedCases, setRemovedCases] = useState<GameCase[] | null>(null);
  const [offer, setOffer] = useState<PoolPlayer | null>(null);
  const [reset, setReset] = useState(false);
  const [leftovers, setLeftovers] = useState<PoolPlayer[] | null>(null);
  const [displayCases, setDisplayCases] = useState<GameCase[] | null>(null);

  const buildCases = useCallback(async () => {
    setCases(generateCases(pool, 10));
  }, []);

  const buildDisplayCases = () => {
    const copy = [...cases!];
    function shuffle(array: GameCase[]) {
      let currentIndex = array.length;
      while (currentIndex !== 0) {
        const randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
      }
      return array;
    }
    shuffle(copy);
    setDisplayCases(copy);
  };

  const buildLeftovers = async () => {
    const genLeftovers = (arr: GameCase[]) => {
      let copyPool = [...pool];
      const copyCases = arr;
      for (const item of copyCases) {
        copyPool = copyPool.filter((player) => player.name !== item.name);
      }
      return copyPool;
    };
    const realLeftovers = await genLeftovers(cases!);
    setLeftovers(realLeftovers);
  };

  const removeOfferFromLeftovers = (offer: PoolPlayer) => {
    const offerToRemoveIndex = leftovers!.findIndex((player) => player.playerId === offer.playerId);
    if (offerToRemoveIndex !== -1) {
      leftovers!.splice(offerToRemoveIndex, 1);
    }
  };

  const resetGame = () => {
    setReset(true);
  };

  const removeCases = (arr: GameCase[], n: number): GameCase[] => {
    const result: GameCase[] = new Array(n);
    let len = arr.length;
    const taken: number[] = new Array(len);
    if (n > len) throw new RangeError("getRandom: more elements taken than available");
    let i = n;
    while (i--) {
      const x = Math.floor(Math.random() * len);
      result[i] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
  };

  const selectCase = (box: GameCase) => {
    setCaseSelected(box);
    const copy = [...cases!];
    const index = copy.indexOf(box);
    copy.splice(index, 1);
    setGameCases(copy);
    setRound(1);
  };

  const elimCases = useCallback(async (num: number) => {
    setThinking(true);
    const latestCases = gameCases!;
    const removed = removeCases(latestCases, num);
    setThinking(false);
    if (removedCases) {
      for (const item of removed) {
        setRemovedCases((prev) => [...prev!, item]);
      }
    } else {
      setRemovedCases(removed);
    }

    let copyOrigCases = cases!;
    let copyDisplayCases = displayCases!;

    for (let i = 0; i < removed.length; i++) {
      const copy = gameCases!;
      const index = copy.indexOf(removed[i]);
      copy.splice(index, 1);
      await setGameCases(copy);

      copyOrigCases = copyOrigCases.map((box) =>
        box.name === removed[i].name ? { ...box, opened: true } : box
      );
      copyDisplayCases = copyDisplayCases.map((box) =>
        box.name === removed[i].name ? { ...box, opened: true } : box
      );
    }

    setCases(copyOrigCases);
    setDisplayCases(copyDisplayCases);

    if (round <= 3) {
      buildOffer(gameCases!, caseSelected!);
    }
  }, [gameCases, removedCases, round, cases, displayCases, caseSelected]);

  const buildOffer = async (arr: GameCase[], toAdd: GameCase) => {
    const latestCases = [...arr, toAdd];
    const len = latestCases.length;
    let offerValue = latestCases.reduce((prev, curr) => prev + Math.pow(curr.points, 2), 0);
    offerValue = Math.sqrt(offerValue / len);
    offerValue = Math.round(offerValue * 100) / 100;
    console.log(offerValue);

    const getClosestPoints = (data: PoolPlayer[], target: number) =>
      data.reduce((acc, obj) =>
        Math.abs(target - obj.points) < Math.abs(target - acc.points) ? obj : acc
      );
    const playerOffer = getClosestPoints(leftovers!, offerValue);
    console.log("the player to be offered is: ", playerOffer);
    setOffer(playerOffer);
  };

  const cleanUpCaseDisplay = useCallback(async (lastRemaining: GameCase) => {
    const copyCases = cases!.map((box) =>
      box.name === lastRemaining.name ? { ...box, opened: true } : box
    );
    const copyDisplayCases = displayCases!.map((box) =>
      box.name === lastRemaining.name ? { ...box, opened: true } : box
    );
    setCases(copyCases);
    setDisplayCases(copyDisplayCases);
  }, [cases, displayCases]);

  const cleanAllCases = useCallback(async () => {
    setCases(cases!.map((box) => ({ ...box, opened: true })));
    setDisplayCases(displayCases!.map((box) => ({ ...box, opened: true })));
  }, [cases]);

  const declineOffer = () => {
    removeOfferFromLeftovers(offer!);
    setRound(round + 1);
  };

  const keep = useCallback(async () => {
    const lastRemaining = gameCases![0];
    setRemovedCases((prev) => [...(prev ?? []), lastRemaining]);
    cleanUpCaseDisplay(lastRemaining);
    setRound(round + 1);
  }, [gameCases, round, cases]);

  const swap = useCallback(async () => {
    const lastRemaining = gameCases![0];
    const ogSelected = caseSelected!;
    setRemovedCases((prev) => [...(prev ?? []), ogSelected]);
    setCaseSelected(lastRemaining);
    cleanUpCaseDisplay(ogSelected);
    setRound(round + 1);
  }, [gameCases, round, cases]);

  const acceptOffer = () => {
    const accepted = offer!;
    setRemovedCases(cases);
    setCaseSelected({ ...accepted, number: 0, opened: true });
    cleanAllCases();
    setRound(5);
  };

  useEffect(() => {
    if (!cases) buildCases();
  }, [cases]);

  useEffect(() => {
    if (cases && leftovers === null) buildLeftovers();
  }, [cases, leftovers]);

  useEffect(() => {
    if (cases && !displayCases) buildDisplayCases();
  }, [cases, displayCases]);

  useEffect(() => {
    if (round === 1) elimCases(3);
    if (round === 2) elimCases(2);
    if (round === 3) elimCases(2);
    if (round === 4) elimCases(1);
  }, [round]);

  useEffect(() => {
    if (reset) {
      setLeftovers(null);
      setCases(null);
      setCaseSelected(null);
      setGameCases(null);
      setRound(0);
      setThinking(false);
      setRemovedCases(null);
      setOffer(null);
      setDisplayCases(null);
      setReset(false);
    }
  }, [reset]);

  // ── Presentation only below this line ──────────────────────────────────
  // The game logic above is the original, untouched. Everything here was
  // rebuilt in Phase 7 so quick-play matches the league game screen instead of
  // dropping an anonymous visitor onto the pre-overhaul board.

  /** The quick-play board keeps its own case shape; Briefcase speaks GameBox. */
  const toGameBox = (box: GameCase): GameBox => ({
    boxNumber: box.number,
    boxStatus: box.opened ? 'eliminated' : 'available',
    playerName: box.name,
    projectedPoints: box.points,
  });

  const renderBoard = () => (
    <div
      className="grid grid-cols-2 justify-items-center gap-5 rounded-xl border border-border bg-surface/40 p-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 sm:p-6"
      role="group"
      aria-label="Case board"
    >
      {(cases ?? []).map((box, index) => {
        const isClickable = !caseSelected && !box.opened;
        const isUserSelected = !!caseSelected && caseSelected.number === box.number;

        return (
          <button
            key={index}
            type="button"
            disabled={!isClickable}
            onClick={isClickable ? () => selectCase(cases![index]) : undefined}
            aria-label={
              box.opened
                ? `Case ${box.number}, opened: ${box.name}, ${box.points} points`
                : `Case ${box.number}`
            }
            className="rounded-md disabled:cursor-default"
          >
            <Briefcase
              box={toGameBox(box)}
              isUserSelected={isUserSelected}
              // round 5 is the reveal — light up the case that was yours.
              isFinalWinner={isUserSelected && round === 5}
              isClickable={isClickable}
            />
          </button>
        );
      })}
    </div>
  );

  const renderPool = () => {
    if (!displayCases) return null;

    const remaining = displayCases.filter((item) => !item.opened);
    const opened = displayCases.filter((item) => item.opened);

    // Best still-available first, opened ones sunk to the bottom — the same
    // ordering the league game's rail uses. Safe for game integrity: the pool
    // list is already shuffled away from case order, and sorting by points
    // reveals nothing about which case holds whom.
    const byPoints = (a: GameCase, b: GameCase) => b.points - a.points;
    const sortedPool = [...remaining].sort(byPoints).concat([...opened].sort(byPoints));

    return (
      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wide text-text-strong">
            In play
          </h2>
          <span className="tnum font-mono text-sm text-text-muted">
            {remaining.length}/{displayCases.length}
          </span>
        </div>

        <ul className="space-y-1.5">
          {sortedPool.map((item, index) => (
            <li
              key={index}
              className={`flex items-center gap-3 rounded border px-3 py-2 ${
                item.opened
                  ? 'border-transparent bg-surface-sunken/40'
                  : 'border-border bg-surface-sunken'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    item.opened ? 'text-text-faint line-through' : 'text-text'
                  }`}
                >
                  {item.name}
                </p>
                <p className="truncate text-xs text-text-subtle">
                  {item.team} {item.status} · Opp {item.opponent}
                </p>
              </div>
              <span
                className={`tnum shrink-0 font-mono text-sm ${
                  item.opened ? 'text-text-faint' : 'text-text-muted'
                }`}
              >
                {item.points}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const renderActions = () => {
    if (offer && round <= 3) {
      return (
        <section
          aria-label="Banker's offer"
          className="overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-b from-gold-bg/60 to-surface shadow-lg"
        >
          <div className="border-b border-gold/25 bg-gold/10 px-5 py-2.5 text-center">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-gold">
              The banker offers
            </h2>
          </div>

          <div className="px-5 py-6 text-center">
            <p className="font-display text-2xl font-bold leading-tight text-text-strong sm:text-3xl">
              {offer.name}
            </p>
            <p className="mt-2 text-sm text-text-muted">
              {offer.team} {offer.status} · Proj {offer.points} · Opp {offer.opponent}
            </p>
          </div>

          <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row">
            <Button size="lg" fullWidth onClick={acceptOffer}>
              Deal
            </Button>
            <Button size="lg" variant="outline" fullWidth onClick={declineOffer}>
              No deal
            </Button>
          </div>
        </section>
      );
    }

    if (offer && round === 4) {
      return (
        <section
          aria-label="Final decision"
          className="overflow-hidden rounded-xl border border-brand/40 bg-surface shadow-lg"
        >
          <div className="border-b border-brand/25 bg-brand/10 px-5 py-2.5 text-center">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-brand">
              Two cases left
            </h2>
          </div>

          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-surface-sunken p-4 text-center">
              <p className="text-label uppercase text-text-subtle">Your case</p>
              <p className="mt-1 font-display text-3xl font-bold text-text-strong">
                #{caseSelected?.number}
              </p>
              <Button className="mt-4" fullWidth onClick={keep}>
                Keep it
              </Button>
            </div>

            <div className="rounded-lg border border-border bg-surface-sunken p-4 text-center">
              <p className="text-label uppercase text-text-subtle">Last case</p>
              <p className="mt-1 font-display text-3xl font-bold text-text-strong">
                #{gameCases![0].number}
              </p>
              <Button className="mt-4" variant="outline" fullWidth onClick={swap}>
                Swap for it
              </Button>
            </div>
          </div>
        </section>
      );
    }

    if (offer && round === 5) {
      return (
        <section className="overflow-hidden rounded-xl border border-success/40 bg-surface shadow-lg">
          <div className="px-5 py-6 text-center">
            <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-success">
              {caseSelected?.number ? `Case #${caseSelected.number} was yours` : 'Deal — you took the offer'}
            </p>
            <p className="mt-3 font-display text-2xl font-bold leading-tight text-text-strong sm:text-3xl">
              {caseSelected?.name}
            </p>
            <p className="tnum mt-1 font-mono text-sm text-text-muted">
              {caseSelected?.points} projected points
            </p>
          </div>
          <div className="border-t border-border px-5 py-4">
            <Button size="lg" fullWidth onClick={resetGame}>
              Play another board
            </Button>
          </div>
        </section>
      );
    }

    return (
      <Button variant="secondary" size="lg" fullWidth onClick={resetGame}>
        Reset board
      </Button>
    );
  };

  return (
    <PageContainer width="wide">
      <header className="mb-6 border-b border-border pb-5">
        <p className="text-label uppercase text-text-subtle">Quick play</p>
        <h1 className="mt-1 font-display text-2xl font-bold text-text-strong">
          Ten cases, one player
        </h1>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-5">
          <p className="text-center text-sm text-text-muted" role="status" aria-live="polite">
            {thinking
              ? 'Opening cases...'
              : caseSelected
                ? `You're holding case #${caseSelected.number}`
                : 'Pick a case to start.'}
          </p>

          {renderBoard()}
          {renderActions()}
        </div>

        <aside className="lg:sticky lg:top-20 lg:self-start">{renderPool()}</aside>
      </div>
    </PageContainer>
  );
};

export default DisplayGame;

import type { GameBox, GameOffer, GamePlayer } from '../../types';

/**
 * The quick-play board — the demo game on the home page.
 *
 * This is the one place in the frontend that owns game logic, and it is a
 * deliberate exception to the rule in CLAUDE.md. Quick play has no account, no
 * league and no team behind it: an anonymous visitor deals a board, plays it
 * once, and nothing is recorded. There is no opponent to cheat and no lineup to
 * protect, so a server round-trip per case would buy integrity that is not at
 * stake — and would mean inventing anonymous teams to hang the state on.
 * Everything a real lineup depends on still goes through the backend by way of
 * `useGameState`, untouched.
 *
 * What quick play does copy from the backend is the *rules*, so the demo
 * teaches the real game rather than a lookalike. Mirrored from TeamsService:
 *   - ten cases, one of them held by the player
 *   - eliminations of 3, then 2, 2, 1 (`eliminateCases`)
 *   - the banker offers the pool player whose projection is closest to the
 *     quadratic mean of the cases still in play (`calculateOffer`)
 *   - a player who has been offered is never offered again
 *
 * The engine is a pure reducer over an injectable RNG. That is what makes the
 * rules testable without a DOM, and what lets the component drop the chain of
 * cascading effects the previous board needed to drive itself.
 */

/** Cases dealt onto a quick-play board. */
export const CASE_COUNT = 10;

/** Injectable `Math.random`, so a test can pin the deal. */
export type Rng = () => number;

export type QuickPlayPhase = 'choosing' | 'offer' | 'final' | 'revealed';

export type QuickPlayOutcome =
  | { kind: 'deal'; playerName: string; projectedPoints: number }
  | {
      kind: 'case';
      boxNumber: number;
      playerName: string;
      projectedPoints: number;
      swapped: boolean;
    };

export interface QuickPlayState {
  /** Board order, 1..CASE_COUNT. This is where the case-to-player mapping lives. */
  boxes: GameBox[];
  /** The dealt players in rail order — shuffled away from board order. */
  dealt: GamePlayer[];
  /** Pool players in no case and not yet offered: the banker's shortlist. */
  bench: GamePlayer[];
  /** Kept so "play another board" re-deals without another round-trip. */
  pool: GamePlayer[];
  selectedBoxNumber: number | null;
  offer: GameOffer | null;
  outcome: QuickPlayOutcome | null;
}

export type QuickPlayAction =
  | { type: 'deal'; pool: GamePlayer[] }
  | { type: 'redeal' }
  | { type: 'selectCase'; boxNumber: number }
  | { type: 'acceptOffer' }
  | { type: 'declineOffer' }
  | { type: 'keep' }
  | { type: 'swap' };

// ─── Rules ────────────────────────────────────────────────────────────────────

const IN_PLAY = ['available', 'selected'];

const inPlay = (boxes: GameBox[]): GameBox[] =>
  boxes.filter((box) => IN_PLAY.includes(box.boxStatus));

/**
 * How many cases open next, from how many are still unopened besides yours.
 *
 * Straight from `TeamsService.eliminateCases`: 9 available means round one and
 * three cases, then two, two, and a last single case that leaves the final pair.
 */
export const casesToEliminate = (availableCount: number): number => {
  if (availableCount >= 9) return 3;
  if (availableCount >= 4) return 2;
  return 1;
};

/** Fisher-Yates, on a copy — the engine never mutates what it is handed. */
const shuffle = <T,>(items: T[], rng: Rng): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const sample = <T,>(items: T[], count: number, rng: Rng): T[] =>
  shuffle(items, rng).slice(0, count);

/**
 * The banker's counter-offer: the quadratic mean of the projections still in
 * play, matched to the closest player left in the pool.
 *
 * The quadratic mean rather than the average is what makes the offer chase the
 * top of the board — one big projection still standing pulls it up hard.
 */
const bankerOffer = (boxes: GameBox[], bench: GamePlayer[]): GameOffer | null => {
  const eligible = inPlay(boxes);
  if (eligible.length === 0 || bench.length === 0) return null;

  const target = Math.sqrt(
    eligible.reduce((sum, box) => sum + (box.projectedPoints ?? 0) ** 2, 0) / eligible.length,
  );

  const closest = bench.reduce((best, player) =>
    Math.abs(player.projectedPoints - target) < Math.abs(best.projectedPoints - target)
      ? player
      : best,
  );

  return {
    playerId: closest.playerId,
    playerName: closest.playerName,
    projectedPoints: closest.projectedPoints,
    injuryStatus: closest.injuryStatus,
    matchup: closest.matchup,
    status: 'pending',
  };
};

/** Open this round's cases, then take the banker's call. */
const openCases = (state: QuickPlayState, rng: Rng): QuickPlayState => {
  const available = state.boxes.filter((box) => box.boxStatus === 'available');
  if (available.length === 0) return state;

  const opening = new Set(
    sample(available, Math.min(casesToEliminate(available.length), available.length), rng).map(
      (box) => box.boxNumber,
    ),
  );

  const boxes = state.boxes.map((box) =>
    opening.has(box.boxNumber) ? { ...box, boxStatus: 'eliminated' } : box,
  );

  // Yours plus one: the banker is out of room and it comes down to keep or swap.
  if (inPlay(boxes).length <= 2) return { ...state, boxes, offer: null };

  const offer = bankerOffer(boxes, state.bench);

  return {
    ...state,
    boxes,
    offer,
    // Offered once, never offered again — the backend filters on every previous
    // offer, accepted or rejected alike.
    bench: offer ? state.bench.filter((player) => player.playerId !== offer.playerId) : state.bench,
  };
};

/** End of the game: every case opens, and at most one of them is crowned. */
const revealAll = (boxes: GameBox[], winningBoxNumber: number | null): GameBox[] =>
  boxes.map((box) => ({
    ...box,
    boxStatus: box.boxNumber === winningBoxNumber ? 'selected' : 'eliminated',
  }));

// ─── Dealing ──────────────────────────────────────────────────────────────────

export const dealBoard = (pool: GamePlayer[], rng: Rng = Math.random): QuickPlayState => {
  if (pool.length < CASE_COUNT) {
    throw new RangeError(`A board needs ${CASE_COUNT} players; the pool has ${pool.length}`);
  }

  const inCases = sample(pool, CASE_COUNT, rng);
  const inCaseIds = new Set(inCases.map((player) => player.playerId));

  return {
    boxes: inCases.map((player, index) => ({
      boxNumber: index + 1,
      boxStatus: 'available',
      playerId: player.playerId,
      playerName: player.playerName,
      projectedPoints: player.projectedPoints,
    })),
    // Shuffled a second time: the rail lists who is in play, and its order must
    // say nothing about which case holds whom.
    dealt: shuffle(inCases, rng).map((player) => ({ ...player, boxStatus: 'available' })),
    bench: pool.filter((player) => !inCaseIds.has(player.playerId)),
    pool,
    selectedBoxNumber: null,
    offer: null,
    outcome: null,
  };
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

/**
 * Every transition the board can make, as one pure function.
 *
 * Actions that don't apply to the current phase return the state untouched
 * rather than throwing, so a double-click on "Deal" or a stray keypress can't
 * put the board somewhere the UI has no rendering for.
 */
export const createQuickPlayReducer =
  (rng: Rng = Math.random) =>
  (state: QuickPlayState | null, action: QuickPlayAction): QuickPlayState | null => {
    if (action.type === 'deal') return dealBoard(action.pool, rng);
    if (!state) return state;

    switch (action.type) {
      case 'redeal':
        return dealBoard(state.pool, rng);

      case 'selectCase': {
        if (state.outcome || state.selectedBoxNumber !== null) return state;
        const target = state.boxes.find((box) => box.boxNumber === action.boxNumber);
        if (!target || target.boxStatus !== 'available') return state;

        const boxes = state.boxes.map((box) =>
          box.boxNumber === action.boxNumber ? { ...box, boxStatus: 'selected' } : box,
        );
        return openCases({ ...state, boxes, selectedBoxNumber: action.boxNumber }, rng);
      }

      case 'declineOffer':
        if (state.outcome || !state.offer) return state;
        return openCases({ ...state, offer: null }, rng);

      case 'acceptOffer':
        if (state.outcome || !state.offer) return state;
        return {
          ...state,
          // Yours opens too. Finding out what you walked away from is the whole
          // point of taking the deal.
          boxes: revealAll(state.boxes, null),
          offer: { ...state.offer, status: 'accepted' },
          outcome: {
            kind: 'deal',
            playerName: state.offer.playerName,
            projectedPoints: state.offer.projectedPoints,
          },
        };

      case 'keep':
      case 'swap': {
        if (state.outcome || state.selectedBoxNumber === null) return state;

        const standing = inPlay(state.boxes);
        if (standing.length !== 2) return state;

        const winner =
          action.type === 'keep'
            ? standing.find((box) => box.boxNumber === state.selectedBoxNumber)
            : standing.find((box) => box.boxNumber !== state.selectedBoxNumber);
        if (!winner) return state;

        return {
          ...state,
          boxes: revealAll(state.boxes, winner.boxNumber),
          selectedBoxNumber: winner.boxNumber,
          offer: null,
          outcome: {
            kind: 'case',
            boxNumber: winner.boxNumber,
            playerName: winner.playerName ?? '',
            projectedPoints: winner.projectedPoints ?? 0,
            swapped: action.type === 'swap',
          },
        };
      }

      default:
        return state;
    }
  };

// ─── Selectors ────────────────────────────────────────────────────────────────

export const phaseOf = (state: QuickPlayState): QuickPlayPhase => {
  if (state.outcome) return 'revealed';
  if (state.selectedBoxNumber === null) return 'choosing';
  return inPlay(state.boxes).length <= 2 ? 'final' : 'offer';
};

/**
 * The board in the shape `CaseBoard` is fed by the league game: an unopened
 * case gives away nothing but its number.
 *
 * The mapping is a couple of properties away in memory either way — this is not
 * a security boundary, and it isn't pretending to be. It is what lets quick play
 * reuse `CaseBoard` verbatim instead of forking it, and it keeps the accidental
 * reveal (a stray `playerName` rendered under a closed lid) impossible rather
 * than merely unlikely.
 */
export const visibleBoxes = (state: QuickPlayState): GameBox[] =>
  state.boxes.map((box) =>
    state.outcome || box.boxStatus === 'eliminated'
      ? box
      : { boxNumber: box.boxNumber, boxStatus: box.boxStatus },
  );

/**
 * The pool rail. Mirrors the backend, which reports a selected player as merely
 * available: the rail says who is still in play, never which case you hold.
 */
export const railPlayers = (state: QuickPlayState): GamePlayer[] => {
  const statusByPlayerId = new Map(state.boxes.map((box) => [box.playerId, box.boxStatus]));

  return state.dealt.map((player) => {
    const status = statusByPlayerId.get(player.playerId) ?? 'available';
    return {
      ...player,
      boxStatus: !state.outcome && status === 'selected' ? 'available' : status,
    };
  });
};

/**
 * The case the player is holding.
 *
 * After a deal it comes back nameless on purpose: the case was yours, but the
 * player inside it is not, and `CaseBoard` crowns whichever selected case has a
 * name on it.
 */
export const yourCase = (state: QuickPlayState): GameBox | null => {
  const box = visibleBoxes(state).find((item) => item.boxNumber === state.selectedBoxNumber);
  if (!box) return null;
  return state.outcome?.kind === 'deal'
    ? { boxNumber: box.boxNumber, boxStatus: box.boxStatus }
    : box;
};

/** The one case left standing against yours, once it comes down to two. */
export const lastCaseStanding = (state: QuickPlayState): GameBox | undefined =>
  visibleBoxes(state).find(
    (box) => box.boxStatus === 'available' && box.boxNumber !== state.selectedBoxNumber,
  );

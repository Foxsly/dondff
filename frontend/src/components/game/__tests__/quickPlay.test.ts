import type { GamePlayer } from '../../../types';
import {
  CASE_COUNT,
  createQuickPlayReducer,
  dealBoard,
  lastCaseStanding,
  phaseOf,
  railPlayers,
  visibleBoxes,
  yourCase,
  type QuickPlayState,
} from '../quickPlay';

/**
 * The quick-play engine is the only game logic that lives in the frontend, so
 * it is the only game logic without an E2E test standing behind it. These cover
 * the rules it is supposed to be mirroring from TeamsService — the elimination
 * schedule, the banker's arithmetic, and the fact that the pool rail never
 * gives away which case the player is holding.
 *
 * Every test drives a seeded RNG, so a failure is a rule that changed rather
 * than an unlucky deal.
 */

/** Deterministic mulberry32 — same sequence on every run and every machine. */
const seededRng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** A pool of 40 players projected 1.0, 1.5, 2.0 ... so values are predictable. */
const makePool = (size = 40): GamePlayer[] =>
  Array.from({ length: size }, (_, index) => ({
    playerId: `p${index}`,
    playerName: `Player ${index}`,
    projectedPoints: 1 + index * 0.5,
    boxStatus: 'available',
    matchup: { team: 'BUF', opponent: 'NYJ' },
  }));

const reducer = createQuickPlayReducer(seededRng(42));

const deal = (pool = makePool()): QuickPlayState =>
  reducer(null, { type: 'deal', pool }) as QuickPlayState;

const inPlayCount = (state: QuickPlayState) =>
  state.boxes.filter((box) => box.boxStatus === 'available' || box.boxStatus === 'selected').length;

describe('dealBoard', () => {
  it('deals ten unopened cases and benches the rest of the pool', () => {
    const pool = makePool();
    const state = dealBoard(pool, seededRng(7));

    expect(state.boxes).toHaveLength(CASE_COUNT);
    expect(state.boxes.map((box) => box.boxNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(state.boxes.every((box) => box.boxStatus === 'available')).toBe(true);

    // No player is both in a case and available to be offered.
    const inCases = new Set(state.boxes.map((box) => box.playerId));
    expect(state.bench).toHaveLength(pool.length - CASE_COUNT);
    expect(state.bench.some((player) => inCases.has(player.playerId))).toBe(false);
  });

  it('orders the rail independently of the board', () => {
    const state = dealBoard(makePool(), seededRng(7));

    const boardOrder = state.boxes.map((box) => box.playerId);
    const railOrder = state.dealt.map((player) => player.playerId);

    expect([...railOrder].sort()).toEqual([...boardOrder].sort());
    // Reading the rail top to bottom must not walk you along the board.
    expect(railOrder).not.toEqual(boardOrder);
  });

  it('refuses to deal a board it cannot fill', () => {
    expect(() => dealBoard(makePool(9), seededRng(1))).toThrow(RangeError);
  });
});

describe('the round schedule', () => {
  it('opens three cases when the player picks, and makes an offer', () => {
    const state = reducer(deal(), { type: 'selectCase', boxNumber: 4 }) as QuickPlayState;

    expect(state.selectedBoxNumber).toBe(4);
    expect(state.boxes.filter((box) => box.boxStatus === 'eliminated')).toHaveLength(3);
    expect(inPlayCount(state)).toBe(7);
    expect(state.offer).not.toBeNull();
    expect(phaseOf(state)).toBe('offer');
  });

  it('runs 3, 2, 2, 1 and ends on the final pair after three offers', () => {
    let state = reducer(deal(), { type: 'selectCase', boxNumber: 1 }) as QuickPlayState;
    const offered = [state.offer!.playerId];
    expect(inPlayCount(state)).toBe(7);

    state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    offered.push(state.offer!.playerId);
    expect(inPlayCount(state)).toBe(5);

    state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    offered.push(state.offer!.playerId);
    expect(inPlayCount(state)).toBe(3);

    state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    expect(inPlayCount(state)).toBe(2);
    // Two cases left is keep-or-swap, not another offer.
    expect(state.offer).toBeNull();
    expect(phaseOf(state)).toBe('final');

    // A player the banker has already named never comes back.
    expect(new Set(offered).size).toBe(3);
  });
});

describe('the banker', () => {
  it('offers the pool player closest to the quadratic mean of what is in play', () => {
    const state = reducer(deal(), { type: 'selectCase', boxNumber: 2 }) as QuickPlayState;

    const inPlay = state.boxes.filter(
      (box) => box.boxStatus === 'available' || box.boxStatus === 'selected',
    );
    const target = Math.sqrt(
      inPlay.reduce((sum, box) => sum + (box.projectedPoints ?? 0) ** 2, 0) / inPlay.length,
    );

    const inCases = new Set(state.boxes.map((box) => box.playerId));
    const candidates = makePool().filter((player) => !inCases.has(player.playerId));
    const closest = candidates.reduce((best, player) =>
      Math.abs(player.projectedPoints - target) < Math.abs(best.projectedPoints - target)
        ? player
        : best,
    );

    expect(state.offer!.playerId).toBe(closest.playerId);
    expect(state.offer!.status).toBe('pending');
  });

  it('never offers a player who is in a case', () => {
    let state = reducer(deal(), { type: 'selectCase', boxNumber: 5 }) as QuickPlayState;
    const inCases = new Set(state.boxes.map((box) => box.playerId));

    for (let round = 0; round < 2; round++) {
      expect(inCases.has(state.offer!.playerId!)).toBe(false);
      state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    }
  });
});

describe('finishing the board', () => {
  it('accepting the deal opens every case, including the one you were holding', () => {
    const played = reducer(deal(), { type: 'selectCase', boxNumber: 3 }) as QuickPlayState;
    const offer = played.offer!;

    const state = reducer(played, { type: 'acceptOffer' }) as QuickPlayState;

    expect(state.outcome).toEqual({
      kind: 'deal',
      playerName: offer.playerName,
      projectedPoints: offer.projectedPoints,
    });
    expect(state.boxes.every((box) => box.boxStatus === 'eliminated')).toBe(true);
    expect(state.offer!.status).toBe('accepted');
    expect(phaseOf(state)).toBe('revealed');

    // The case was yours; the player in it is not. Leaving a name on it would
    // have CaseBoard crown it as the player you won.
    expect(yourCase(state)).toEqual({ boxNumber: 3, boxStatus: 'eliminated' });
  });

  it('keeping locks in the case you picked; swapping locks in the other one', () => {
    let state = reducer(deal(), { type: 'selectCase', boxNumber: 6 }) as QuickPlayState;
    for (let round = 0; round < 3; round++) {
      state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    }

    const held = state.boxes.find((box) => box.boxNumber === 6)!;
    const other = lastCaseStanding(state)!;
    expect(other.boxNumber).not.toBe(6);

    const kept = reducer(state, { type: 'keep' }) as QuickPlayState;
    expect(kept.outcome).toMatchObject({
      kind: 'case',
      boxNumber: 6,
      playerName: held.playerName,
      swapped: false,
    });

    const swapped = reducer(state, { type: 'swap' }) as QuickPlayState;
    expect(swapped.outcome).toMatchObject({
      kind: 'case',
      boxNumber: other.boxNumber,
      swapped: true,
    });
    expect(swapped.selectedBoxNumber).toBe(other.boxNumber);
  });
});

describe('what the board gives away', () => {
  it('shows nothing but a number on an unopened case', () => {
    const state = reducer(deal(), { type: 'selectCase', boxNumber: 8 }) as QuickPlayState;

    const boxes = visibleBoxes(state);
    const opened = boxes.filter((box) => box.boxStatus === 'eliminated');
    const closed = boxes.filter((box) => box.boxStatus !== 'eliminated');

    expect(opened).toHaveLength(3);
    expect(opened.every((box) => box.playerName !== undefined)).toBe(true);

    // A closed case carries a number and a status and nothing else — not a
    // name to leak, not a projection to infer one from.
    expect(closed.map((box) => Object.keys(box).sort())).toEqual(
      closed.map(() => ['boxNumber', 'boxStatus']),
    );
  });

  it('does not let the rail identify the case the player is holding', () => {
    const state = reducer(deal(), { type: 'selectCase', boxNumber: 8 }) as QuickPlayState;

    // The held case reads as "still in play", exactly like the six beside it.
    expect(railPlayers(state).some((player) => player.boxStatus === 'selected')).toBe(false);
    expect(railPlayers(state).filter((player) => player.boxStatus === 'available')).toHaveLength(7);
  });

  it('reveals the held player once the game is over', () => {
    let state = reducer(deal(), { type: 'selectCase', boxNumber: 8 }) as QuickPlayState;
    for (let round = 0; round < 3; round++) {
      state = reducer(state, { type: 'declineOffer' }) as QuickPlayState;
    }
    state = reducer(state, { type: 'keep' }) as QuickPlayState;

    // CaseBoard opens every lid only when no player is left "available".
    expect(railPlayers(state).some((player) => player.boxStatus === 'available')).toBe(false);
    expect(railPlayers(state).filter((player) => player.boxStatus === 'selected')).toHaveLength(1);
    expect(yourCase(state)!.playerName).toBeDefined();
  });
});

describe('actions that do not apply', () => {
  it('ignores a second pick, a decline with no offer, and a final call too early', () => {
    const dealt = deal();

    expect(reducer(dealt, { type: 'declineOffer' })).toBe(dealt);
    expect(reducer(dealt, { type: 'keep' })).toBe(dealt);
    expect(reducer(dealt, { type: 'swap' })).toBe(dealt);
    expect(reducer(dealt, { type: 'acceptOffer' })).toBe(dealt);

    const played = reducer(dealt, { type: 'selectCase', boxNumber: 9 }) as QuickPlayState;
    expect(reducer(played, { type: 'selectCase', boxNumber: 2 })).toBe(played);
    expect(reducer(played, { type: 'keep' })).toBe(played);

    const finished = reducer(played, { type: 'acceptOffer' }) as QuickPlayState;
    expect(reducer(finished, { type: 'declineOffer' })).toBe(finished);
    expect(reducer(finished, { type: 'selectCase', boxNumber: 1 })).toBe(finished);
  });

  it('re-deals from the pool it already has', () => {
    const first = reducer(deal(), { type: 'selectCase', boxNumber: 1 }) as QuickPlayState;
    const second = reducer(first, { type: 'redeal' }) as QuickPlayState;

    expect(second.pool).toBe(first.pool);
    expect(second.selectedBoxNumber).toBeNull();
    expect(second.offer).toBeNull();
    expect(second.outcome).toBeNull();
    expect(second.boxes.every((box) => box.boxStatus === 'available')).toBe(true);
  });
});

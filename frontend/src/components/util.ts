import { request } from '../api/client';
import type { PoolPlayer, GameCase } from '../types';

/**
 * Fetch a pool of projected players for a quick-play board.
 *
 * Returns the pool and lets errors propagate. The previous version took a
 * callback and swallowed failures with a console.error, so a failed request or
 * an empty response left the caller with no way to tell the difference between
 * "still loading" and "this will never work" — the UI just sat there.
 */
export const fetchPlayerPool = async (
  eventGroupId: string,
  position: string,
  seasonYear: string | number,
  playerLimit: number,
): Promise<PoolPlayer[]> => {
  const json = await request<any[]>(
    `/players/projections/${seasonYear}/${eventGroupId}/${position}`,
  );

  if (!Array.isArray(json)) return [];

  return json.slice(0, playerLimit).map((playerJson) => ({
    name: playerJson.name,
    points: playerJson.projectedPoints,
    status: playerJson.injuryStatus,
    opponent: playerJson.oppTeam,
    team: playerJson.team,
    playerId: playerJson.playerId,
  }));
};

export const generateCases = (poolArray: PoolPlayer[], numberOfCasesToChoose: number): GameCase[] => {
  const result: PoolPlayer[] = new Array(numberOfCasesToChoose);
  let numberOfPlayersRemainingInPool = poolArray.length;
  const taken: number[] = new Array(poolArray.length);
  if (numberOfCasesToChoose > poolArray.length) {
    throw new RangeError("getRandom: trying to choose more cases than exist in the pool");
  }
  let n = numberOfCasesToChoose;
  while (n--) {
    const x = Math.floor(Math.random() * numberOfPlayersRemainingInPool);
    result[n] = poolArray[x in taken ? taken[x] : x];
    taken[x] = --numberOfPlayersRemainingInPool in taken ? taken[numberOfPlayersRemainingInPool] : numberOfPlayersRemainingInPool;
  }
  return result.map((player, index) => ({
    number: index + 1,
    name: player.name,
    points: player.points,
    opened: false,
    status: player.status,
    opponent: player.opponent,
    team: player.team,
    playerId: player.playerId,
  }));
};

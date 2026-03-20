import { request } from '../api/client';
import type { PoolPlayer, GameCase } from '../types';

export const getPlayers = async (
  week: string | number,
  position: string,
  seasonYear: string | number,
  playerLimit: number,
  callback: (players: PoolPlayer[]) => void,
): Promise<void> => {
  const players: PoolPlayer[] = [];
  try {
    const json = await request<any[]>(`/players/projections/${seasonYear}/${week}/${position}`);
    if (Array.isArray(json)) {
      for (let i = 0; i < playerLimit; i++) {
        const playerJson = json[i];
        if (!playerJson) continue;
        players.push({
          name: playerJson.name,
          points: playerJson.projectedPoints,
          status: playerJson.injuryStatus,
          opponent: playerJson.oppTeam,
          team: playerJson.team,
          playerId: playerJson.playerId,
        });
      }
    }
    callback(players);
  } catch (error) {
    console.error(error);
  }
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

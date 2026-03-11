import type { PoolPlayer, GameCase, SportLeague } from '../types';

const API_BASE =
  (window.RUNTIME_CONFIG && window.RUNTIME_CONFIG.API_BASE_URL) ||
  "http://localhost:3001"; // fallback only for local dev

export const getPlayers = async (
  week: string | number,
  position: string,
  seasonYear: string | number,
  playerLimit: number,
  callback: (players: PoolPlayer[]) => void,
): Promise<void> => {
  console.log("calling getPlayers with " + week + " " + position + " " + seasonYear + " " + playerLimit);
  const players: PoolPlayer[] = [];
  try {
    const url = `${API_BASE}/players/projections/${seasonYear}/${week}/${position}`;
    const response = await fetch(url);
    const json = await response.json();
    for (let i = 0; i < playerLimit; i++) {
      const playerJson = json[i];
      if (!playerJson) { continue; }
      const player: PoolPlayer = {
        name: playerJson.name,
        points: playerJson.projectedPoints,
        status: playerJson.injuryStatus,
        opponent: playerJson.oppTeam,
        team: playerJson.team,
        playerId: playerJson.playerId,
      };
      players.push(player);
    }
    console.log(players);
    callback(players);
  } catch (error) {
    console.log(error);
  }
};

export const getPositionDisplayName = (position: string, sport?: SportLeague): string => {
  if (sport === 'GOLF' || position.startsWith('GOLF_PLAYER')) {
    const num = position.replace('GOLF_PLAYER_', '');
    return `Golfer ${num}`;
  }
  return position;
};

export const isGolfPosition = (position: string): boolean => {
  return position.startsWith('GOLF_PLAYER');
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

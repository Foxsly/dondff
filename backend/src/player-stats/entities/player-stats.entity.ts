export interface IPlayer {
  playerId: string;
  name: string;
  position: PlayerPosition;
  team: string;
  oppTeam: string;
}

export interface IPlayerProjection extends IPlayer {
  projectedPoints: number;
  injuryStatus?: string | null;
  salary?: number;
}

export type PlayerProjectionResponse = IPlayerProjection[];

export interface IPlayerStats extends IPlayer {
  points: number;
}

export type PlayerStatResponse = IPlayerStats[];
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST' | 'GOLF_PLAYER';

export type PlayerTeams = {
  team: string;
  opponent: string;
}
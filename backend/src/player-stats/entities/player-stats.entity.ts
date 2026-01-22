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
}

export type PlayerProjectionResponse = IPlayerProjection[];

export interface IPlayerStats extends IPlayer {
  points: number;
}

export type PlayerStatResponse = IPlayerStats[];
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

export type PlayerTeams = {
  team: string;
  opponent: string;
}
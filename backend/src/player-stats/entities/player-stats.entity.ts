export interface IPlayer {
  id: string;
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
//TODO map sleeper FB->RB, DEF->DST
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
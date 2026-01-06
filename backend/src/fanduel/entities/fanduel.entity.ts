import { ISleeperPlayerEntry, ISleeperPlayerProjectionStats } from '@/sleeper/entities/sleeper.entity';

export type FanduelPlayerProjectionEntry = {
  player: PlayerInfo;
  team: TeamInfo;
  gameInfo: GameInfo;
  fantasy: number;
  positionRank: number;
  overallRank: number;
};

export type PlayerInfo = {
  numberFireId: number;
  name: string;
  position: PlayerPosition;
};

export type TeamInfo = {
  numberFireId: number;
  name: string;
  abbreviation: string;
};

export type GameInfo = {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
};

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

export type FanduelProjectionsResponse = FanduelPlayerProjectionEntry[];
export type FanduelPlayerProjectionEntry = {
  fantasy: number;
  gameInfo: GameInfo;
  player: PlayerInfo;
  team: TeamInfo;
};

export type PlayerInfo = {
  betGeniusId: string;
  name: string;
  position: PlayerPosition;
};

export type TeamInfo = {
  name: string;
  abbreviation: string;
};

export type GameInfo = {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
};

export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

export type FanduelProjectionsResponse = FanduelPlayerProjectionEntry[];
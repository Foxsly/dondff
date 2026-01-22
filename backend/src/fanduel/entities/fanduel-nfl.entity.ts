export type FanduelNflProjectionEntry = {
  fantasy: number;
  gameInfo: GameInfo;
  player: PlayerInfo;
  team: TeamInfo;
};

export type PlayerInfo = {
  betGeniusId: string;
  name: string;
  position: NflPlayerPosition;
};

export type TeamInfo = {
  name: string;
  abbreviation: string;
};

export type GameInfo = {
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
};

export type NflPlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';

export type FanduelNflProjectionsResponse = FanduelNflProjectionEntry[];

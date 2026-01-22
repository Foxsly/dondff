export type FanduelGolfProjectionEntry = {
  fantasy: number;
  salary: string;
  player: PlayerInfo;
};

export type PlayerInfo = {
  numberFireId: number;
  name: string;
  imageUrl: string;
};

export type FanduelGolfProjectionsResponse = FanduelGolfProjectionEntry[];

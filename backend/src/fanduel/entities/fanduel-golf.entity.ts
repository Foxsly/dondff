export type FanduelGolfProjectionEntry = {
  fantasy: number;
  salary: string;
  player: GolferInfo;
};

export type GolferInfo = {
  numberFireId: number;
  name: string;
  imageUrl: string;
};

export type FanduelGolfProjectionsResponse = FanduelGolfProjectionEntry[];

export type GolfLookupEntry = {
  id: string;
  name: string;
};

export type FanduelGolfEventsResponse = GolfLookupEntry[];
export type FanduelGolfSlatesResponse = GolfLookupEntry[];
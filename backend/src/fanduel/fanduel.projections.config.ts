import typia from "typia";
import { FanduelNflProjectionsResponse } from "./entities/fanduel-nfl.entity";

export type FanduelProjectionsBySport = {
  NFL: FanduelNflProjectionsResponse;
  // add more sports here later
};

export type FanduelSport = keyof FanduelProjectionsBySport;

export type ProjectionsInput = {
  sport: string;
  position: string;
  type: string;
  [key: string]: unknown;
};

export type SportProjectionConfig<TResponse> = {
  input: ProjectionsInput;
  fragment: string;
  assert: (input: unknown) => TResponse;
  filter?: (entries: any[]) => any[];
  requiredInputKeys?: string[];
};

export const fanduelProjectionsConfig: {
  [K in FanduelSport]: SportProjectionConfig<FanduelProjectionsBySport[K]>;
} = {
  NFL: {
    input: { type: "PPR", position: "NFL_SKILL", sport: "NFL" },
    fragment: `
      ... on NflSkill {
        fantasy
        gameInfo {
          awayTeam { abbreviation name }
          homeTeam { abbreviation name }
        }
        player { name betGeniusId position }
        team { name abbreviation }
      }
    `,
    assert: typia.misc.createAssertPrune<FanduelNflProjectionsResponse>(),
    filter: (entries) => entries.filter((e) => e?.fantasy >= 0),
  },

};

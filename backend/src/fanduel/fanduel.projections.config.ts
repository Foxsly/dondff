import typia from "typia";
import { FanduelNflProjectionsResponse } from "./entities/fanduel-nfl.entity";
import { FanduelGolfProjectionsResponse } from "./entities/fanduel-golf.entity";

export type FanduelProjectionsBySport = {
  NFL: FanduelNflProjectionsResponse;
  GOLF: FanduelGolfProjectionsResponse;
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

  GOLF: {
    requiredInputKeys: ['slateId', 'eventId'],
    input: { type: "DAILY", position: "GOLF_PLAYER", sport: "GOLF" },
    fragment: `
      ... on GolfPlayer {
        fantasy
        salary
        player { name numberFireId imageUrl }
      }
    `,
    assert: typia.misc.createAssertPrune<FanduelGolfProjectionsResponse>(),
    filter: (entries) => entries.filter((e) => e?.salary && e.salary !== "N/A"),
  },
};

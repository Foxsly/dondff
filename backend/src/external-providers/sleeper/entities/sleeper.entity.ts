import { tags } from 'typia';
/**
 * Stolen from https://github.com/seanwessmith/sleeper-api/blob/main/src/index.ts
 */
// State Interface
export interface ISleeperState {
  week: number;
  season_type: string;
  season: string;
  leg: number;
  league_season: string;
  display_week: number;
}

// -----------------------------
// Player
// -----------------------------
export type SleeperNflPosition = 'QB' | 'RB' | 'FB' | 'WR' | 'TE' | 'K' | 'DEF' | 'DB';
export type SleeperNbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface ISleeperPlayer {
  fantasy_positions: (SleeperNflPosition | SleeperNbaPosition)[];
  first_name: string & tags.MinLength<1>;
  last_name: string & tags.MinLength<1>;
  position: SleeperNflPosition | SleeperNbaPosition;
  injury_status: string | null;
  metadata: ISleeperPlayerMetadata;
}

export interface ISleeperPlayerMetadata {
  genius_id?: string;
  channel_id?: string;
}

// -----------------------------
// Base Stats
// -----------------------------
export interface ISleeperNflPlayerStats {
  pts_std: number;
  pts_half_ppr: number;
  pts_ppr: number;
}

export interface ISleeperNbaPlayerStats {
  pts_std: number;
}

// -----------------------------
// Base entry
// -----------------------------
export interface ISleeperPlayerEntry<TStats> {
  stats: TStats;
  week: number & tags.Minimum<1>;
  season: number & tags.Minimum<2000>;
  season_type: 'regular' | 'post' | 'pre';
  sport: 'nba' | 'nfl';
  player_id: string & tags.MinLength<1>;
  player: ISleeperPlayer;
  team: string & tags.MinLength<2> & tags.MaxLength<3>;
  opponent: string & tags.MinLength<2> & tags.MaxLength<3>;
  game_id: string & tags.MinLength<1>;
  date: Date; // converted from YYYY-MM-DD string
  last_modified: Date; // converted from epoch ms
  updated_at: Date; // converted from epoch ms
}

// -----------------------------
// Responses
// -----------------------------
export type SleeperNflStatResponse = ISleeperPlayerEntry<ISleeperNflPlayerStats>[];
export type SleeperNbaStatResponse = ISleeperPlayerEntry<ISleeperNbaPlayerStats>[];
export type SleeperStatRequest = Pick<ISleeperPlayer, 'position'>;

// -----------------------------
// Season schedule (api.sleeper.com/schedule/:sport/:season_type/:season)
// -----------------------------
/**
 * One game in a Sleeper season schedule. `week` is Sleeper's fantasy week
 * (playoff weeks restart at 1). Completed games also carry box-score fields,
 * which are pruned. NFL rows give each team as a plain string, NBA rows as
 * `{ team }` objects — the service flattens NBA rows to strings, so both
 * sports share this one shape.
 */
export interface ISleeperScheduleGame {
  game_id: string & tags.MinLength<1>;
  date: string & tags.Format<'date'>;
  week: number & tags.Minimum<1>;
  status: string & tags.MinLength<1>;
  home: string;
  away: string;
}

/**
 * Every game in a Sleeper season schedule. NFL team values are not
 * constrained: playoff placeholder rows use labels such as "TBD" or
 * "AFC Championship (win)", and sync only uses dates.
 */
export type SleeperScheduleResponse = ISleeperScheduleGame[];


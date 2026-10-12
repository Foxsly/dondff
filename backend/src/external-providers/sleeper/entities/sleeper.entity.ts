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
export interface IBaseSleeperPlayerStats {
  pts_std: number;
  pts_half_ppr: number;
  pts_ppr: number;
}

// Stats for "stat" endpoint
export interface ISleeperPlayerStats extends IBaseSleeperPlayerStats {
  pos_rank_std?: number & tags.Minimum<1>;
  pos_rank_half_ppr?: number & tags.Minimum<1>;
  pos_rank_ppr?: number & tags.Minimum<1>;
}

// Stats for "projection" endpoint
export interface ISleeperPlayerProjectionStats extends IBaseSleeperPlayerStats {
  pos_adp_dd_ppr?: number & tags.Minimum<1>;
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
export type SleeperStatResponse = ISleeperPlayerEntry<ISleeperPlayerStats>[];
export type SleeperProjectionResponse = ISleeperPlayerEntry<ISleeperPlayerProjectionStats>[];
export type SleeperStatRequest = Pick<ISleeperPlayer, 'position'>;

// -----------------------------
// Season schedule (api.sleeper.com/schedule/:sport/:season_type/:season)
// -----------------------------
/**
 * One game in a Sleeper season schedule. `week` is Sleeper's fantasy week
 * (playoff weeks restart at 1). Completed games also carry box-score fields,
 * which are pruned. NFL rows give each team as a plain string, NBA rows as
 * an object, so the team shape is a parameter.
 */
export interface ISleeperScheduleGame<TTeam> {
  game_id: string & tags.MinLength<1>;
  date: string & tags.Format<'date'>;
  week: number & tags.Minimum<1>;
  status: string & tags.MinLength<1>;
  home: TTeam;
  away: TTeam;
}

/**
 * NFL team values are not constrained: playoff placeholder rows use labels
 * such as "TBD" or "AFC Championship (win)", and sync only uses dates.
 */
export type SleeperNflScheduleResponse = ISleeperScheduleGame<string>[];

export type SleeperNbaScheduleResponse = ISleeperScheduleGame<{
  team: string & tags.MinLength<2> & tags.MaxLength<3>;
}>[];

// -----------------------------
// NBA Types
// -----------------------------
/**
 * The box-score fields that feed Sleeper's default ("pts_std") scoring.
 * Projections hold fractional expected values; `dd`/`td` are probabilities.
 * Any field can be missing — Sleeper omits zero stats.
 * These are only used to calculate projections, since Sleeper's projection API
 * doesn't return a point projection for basketball/NBA
 */
export interface ISleeperNbaStatLine {
  pts?: number;
  reb?: number;
  ast?: number;
  stl?: number;
  blk?: number;
  to?: number;
  tpm?: number;
  dd?: number;
  td?: number;
  bonus_pt_40p?: number;
  bonus_pt_50p?: number;
}

export interface ISleeperNbaGameStats extends ISleeperNbaStatLine {
  /**
   * Sleeper's own fantasy score for the game. Sleeper omits it when the score
   * is 0 — a did-not-play row (`{}`) or one with only non-scoring stats.
   */
  pts_std?: number;
}

export type SleeperNbaProjectionResponse = ISleeperPlayerEntry<ISleeperNbaStatLine>[];
export type SleeperNbaStatResponse = ISleeperPlayerEntry<ISleeperNbaGameStats>[];


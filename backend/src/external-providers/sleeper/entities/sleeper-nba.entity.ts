import { tags } from 'typia';

/**
 * Sleeper NBA types. Unlike NFL, Sleeper's NBA week endpoints return one row
 * per player *per game*, so a player appears once for every game they have
 * in the (Monday–Sunday) fantasy week.
 */

export type SleeperNbaPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export interface ISleeperNbaPlayer {
  fantasy_positions: SleeperNbaPosition[];
  first_name: string;
  last_name: string;
  position: SleeperNbaPosition;
  injury_status: string | null;
}

/**
 * The box-score fields that feed Sleeper's default ("pts_std") scoring.
 * Projections hold fractional expected values; `dd`/`td` are probabilities.
 * Any field can be missing — Sleeper omits zero stats.
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

export interface ISleeperNbaPlayerEntry<TStats> {
  stats: TStats;

  week: number & tags.Minimum<1>;
  season: number & tags.Minimum<2000>;
  season_type: 'regular' | 'post' | 'pre';
  sport: 'nba';
  player_id: string & tags.MinLength<1>;

  player: ISleeperNbaPlayer;

  team: string & tags.MinLength<2> & tags.MaxLength<3>;
  opponent: string & tags.MinLength<2> & tags.MaxLength<3>;
  game_id: string & tags.MinLength<1>;
  date: string & tags.Format<'date'>;
}

export type SleeperNbaProjectionResponse = ISleeperNbaPlayerEntry<ISleeperNbaStatLine>[];
export type SleeperNbaStatResponse = ISleeperNbaPlayerEntry<ISleeperNbaGameStats>[];

import { tags } from 'typia';
/**
 * Stolen from https://github.com/seanwessmith/sleeper-api/blob/main/src/index.ts
 */
// State Interface
export interface ISleeperState {
  week: number;
  season_type: string;
  season_start_date: string;
  season: string;
  previous_season: string;
  leg: number;
  league_season: string;
  league_create_season: string;
  display_week: number;
}

// -----------------------------
// Player
// -----------------------------
export interface ISleeperPlayer {
  fantasy_positions: (string & tags.Pattern<'^(QB|RB|WR|TE|K|DEF|DB)$'>)[];
  first_name: string & tags.MinLength<1>;
  last_name: string & tags.MinLength<1>;
  position: string & tags.Pattern<'^(QB|RB|WR|TE|K|DEF|DB)$'>;
  team: string & tags.MinLength<2> & tags.MaxLength<3>;
  injury_status: string | null;
}

// -----------------------------
// Base Stats
// -----------------------------
export interface IBaseSleeperPlayerStats {
  pts_std: number;
  pts_half_ppr: number;
  pts_ppr: number;
}
//TODO eventually filter out players who have no projection so they don't get picked on accident

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
// Shared entry
// -----------------------------
export interface ISleeperPlayerEntry<TStats> {
  stats: TStats;

  week: number & tags.Minimum<1> & tags.Maximum<25>;
  season: number & tags.Minimum<2000>;
  season_type: 'regular' | 'post' | 'pre';
  sport: 'nfl';
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

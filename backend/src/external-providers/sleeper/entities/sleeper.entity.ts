import { tags } from 'typia';

/**
 * Base interfaces for Sleeper API
 * Sport-specific types are in sleeper-nfl.entity.ts and sleeper-nba.entity.ts
 */

// State Interface - shared across sports
export interface ISleeperState {
  week: number;
  season_type: string;
  season: string;
  previous_season: string;
  leg: number;
  league_season: string;
  league_create_season: string;
  display_week: number;
}

// -----------------------------
// Base Player
// -----------------------------
export interface ISleeperPlayerMetadata {
  [key: string]: string | number | null;
}

export interface ISleeperPlayer {
  fantasy_positions: string[];
  first_name: string & tags.MinLength<1>;
  last_name: string & tags.MinLength<1>;
  position: string;
  injury_status: string | null;
  metadata: ISleeperPlayerMetadata;
}

// -----------------------------
// Shared entry - generic over stats type
// -----------------------------
export interface ISleeperPlayerEntry<TStats> {
  stats: TStats;

  week: number & tags.Minimum<1> & tags.Maximum<25>;
  season: number & tags.Minimum<2000>;
  season_type: 'regular' | 'post' | 'pre';
  sport: 'nfl' | 'nba';
  player_id: string & tags.MinLength<1>;

  player: ISleeperPlayer;

  team: string & tags.MinLength<2> & tags.MaxLength<3>;
  opponent: string & tags.MinLength<2> & tags.MaxLength<3>;
  game_id: string & tags.MinLength<1>;

  date: Date; // converted from YYYY-MM-DD string
  last_modified: Date; // converted from epoch ms
  updated_at: Date; // converted from epoch ms
}

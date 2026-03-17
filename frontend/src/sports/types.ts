import type { ReactNode } from 'react';
import type { SportLeague, GamePlayer, GameOffer } from '../types';

export interface WeekOption {
  value: string;
  label: string;
}

export interface SportConfig {
  key: SportLeague;
  displayName: string;

  /** Label for the time-unit dimension — "Week" for NFL, "Event" for Golf */
  weekLabel: string;

  /** Fetch the current season identifier (e.g. Sleeper season or current year) */
  fetchCurrentSeason: () => Promise<string | null>;

  /** Fetch the current week/event number */
  fetchCurrentWeek: () => Promise<number | null>;

  /** Fetch available weeks/events for a given season */
  fetchAvailableWeeks: (season: string | number) => Promise<WeekOption[]>;

  /**
   * If true, all positions share a single projection pool (fetch once).
   * If false, projections are fetched per-position.
   */
  sharedProjectionPool: boolean;

  /** Whether this sport supports final scoring (entries.tsx shows score columns) */
  supportsScoring: boolean;

  /** Render sport-specific player details in the game view */
  renderPlayerDetails: (player: GamePlayer) => ReactNode;

  /** Render sport-specific offer details in the game view */
  renderOfferDetails: (offer: GameOffer) => ReactNode;

  /** Map position key to a user-friendly display name */
  getPositionDisplayName: (position: string) => string;

  /** Quick-play config for the home page */
  supportsQuickPlay: boolean;
  quickPlayPositions?: string[];
  quickPlayWeekCount?: number;
}

import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';
import { IPlayerProjection, IPlayerStats } from '@/player-stats/entities/player-stats.entity';

export interface IPlayerStatsStrategy {
  /**
   * Fetch pre-event projections for all players in this sport.
   *
   * Projections come from a sport-specific provider (e.g. FanDuel for golf,
   * Sleeper for NFL). Each sport decides which of the params are relevant —
   * some sports return all available players regardless of tournament context.
   *
   * @param season    The season year (e.g. 2025). May be ignored by sports
   *                  whose projections are always current-season.
   * @param eventGroup The event group (tournament/week) context. May be used
   *                   by sports with week-specific projections (NFL) or
   *                   ignored by tournament-agnostic sports (golf).
   * @param events    Sub-events within the event group (e.g. individual rounds,
   *                  weekly games). May be ignored if the provider returns
   *                  aggregated projections for the whole event group.
   * @param position  The roster slot position to filter for (e.g. "GOLF_PLAYER",
   *                  "QB"). May be ignored by sports with a single position type.
   * @returns Array of projections, one per player. Empty array if the
   *          provider has no data for the given context.
   */
  getProjections(
    season: number,
    eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]>;

  /**
   * Fetch live/in-progress statistics for all players in this sport.
   *
   * Statistics represent real-time performance during an event (e.g. hole
   * scores from ESPN leaderboard, NFL game stats from Sleeper). Different
   * providers may be used for projections vs. statistics.
   *
   * @param season    The season year (e.g. 2025). Passed to the provider
   *                  API to correctly scope the data request.
   * @param eventGroup The event group context. The group's name identifies
   *                   the specific tournament/week to the provider.
   * @param events    Sub-events within the event group. May be used to scope
   *                  the stats request to a specific round or game.
   * @param position  The roster slot position to filter for. May be ignored
   *                  by sports with a single position type.
   * @returns Array of stats, one per player with live score. Empty array
   *          if the event hasn't started or the provider has no data.
   */
  getStatistics(
    season: number,
    eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerStats[]>;
}

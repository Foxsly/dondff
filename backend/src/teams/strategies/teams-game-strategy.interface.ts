import { EventGroup } from '@/events/entities/event-group.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';
import { ITeam } from '@/teams/entities/team.entity';

export interface ITeamsGameStrategy {
  /**
   * Whether players are drawn from a shared pool (available to all teams)
   * or exclusive to one team.
   *
   * Golf uses a shared pool — every user drafts from the same set of PGA
   * golfers. NFL uses exclusive assignment — each real NFL player is on
   * exactly one fantasy team.
   */
  usesSharedPlayerPool(): boolean;

  /**
   * Determine which player IDs should be excluded from drafting for the
   * given roster slot on this team.
   *
   * For sports with multiple roster positions (e.g. NFL: QB, RB, WR), a
   * player already assigned to a different position on the same team should
   * be excluded. For single-position sports (golf), all available slots
   * share the same pool and position filtering may not apply.
   *
   * @param team            The team being drafted for. Inspected for
   *                        existing player assignments.
   * @param currentPosition The roster slot position currently being filled
   *                        (e.g. "GOLF_PLAYER_1", "QB").
   * @returns Player IDs that the drafting UI should exclude from the
   *          case selection board.
   */
  getExcludedPlayerIds(team: ITeam, currentPosition: string): Promise<string[]>;

  /**
   * Determine the player pool for a given position on a team.
   *
   * Given the full set of player projections for a position, this method
   * returns the subset that should appear in the Deal or No Deal case
   * selection board. The default implementation filters out excluded
   * players and trims to the pool size; sports with specific constraints
   * (e.g. World Cup per-country quotas) may override this with custom
   * selection logic.
   *
   * @param projections All eligible player projections for the position.
   * @param team        The team being drafted for.
   * @param position    The roster slot position (e.g. "QB", "GK", "DEF").
   * @param poolSize    Maximum number of players to return.
   * @returns The player pool for the case board.
   */
  determinePlayerPool(
    projections: IPlayerProjection[],
    team: ITeam,
    position: string,
    poolSize: number,
  ): Promise<IPlayerProjection[]>;

  /**
   * Return the number of cases on the Deal or No Deal board for the given
   * event group.
   *
   * Some sports use a fixed board size; others may vary based on roster
   * structure or tournament field size.
   *
   * @param eventGroup The event group context (may influence board size).
   * @returns Number of cases/options the user chooses from.
   */
  getNumberOfCases(eventGroup: EventGroup): number;

  /**
   * Normalise a player name for cross-provider matching.
   *
   * Different data providers (FanDuel, ESPN, Sleeper) may format the same
   * player's name differently (suffixes, hyphens, accents, capitals). This
   * method produces a canonical form for reliable comparison.
   *
   * @param name Raw player name from any provider.
   * @returns Normalised name string suitable for equality comparison
   *          across providers.
   */
  normalizePlayerName(name: string): string;
}

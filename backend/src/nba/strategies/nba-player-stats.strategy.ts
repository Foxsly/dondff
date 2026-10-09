import { Injectable } from '@nestjs/common';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import {
  ISleeperNbaPlayerEntry,
  SleeperNbaPosition,
} from '@/external-providers/sleeper/entities/sleeper-nba.entity';
import { IPlayerStatsStrategy } from '@/player-stats/strategies/player-stats-strategy.interface';
import {
  IPlayerProjection,
  IPlayerStats,
  PlayerPosition,
} from '@/player-stats/entities/player-stats.entity';
import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';
import { calculateNbaFantasyPoints } from '@/nba/nba-scoring.util';
import { parseNbaWeekName } from '@/nba/nba-week.util';

/** Which Sleeper positions fill each DOND roster slot. */
const SLOT_POSITIONS: Record<string, SleeperNbaPosition[]> = {
  G: ['PG', 'SG'],
  F: ['SF', 'PF'],
  C: ['C'],
};

interface NbaWeekLine {
  playerId: string;
  name: string;
  team: string;
  injuryStatus: string | null;
  /** Opponents in date order, e.g. "BOS, NYK, MIA" — also tells the user how many games. */
  oppTeam: string;
  bestGame: number;
}

/**
 * A player's DOND amount for an NBA week is their single best fantasy game:
 * the best projected game when drafting, the best actual game when scoring.
 */
@Injectable()
export class NbaPlayerStatsStrategy implements IPlayerStatsStrategy {
  constructor(private readonly sleeperService: SleeperService) {}

  /**
   * Players eligible for `position` through any of their Sleeper fantasy
   * positions, so a PF/C appears in both the F and C pools.
   */
  async getProjections(
    season: number,
    eventGroup: EventGroup,
    _events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]> {
    //seasonYear is already passed in, and is also on the eventGroup

    const { seasonYear, seasonType, week } = parseNbaWeekName(eventGroup.name);
    const projections = await this.sleeperService.getNbaProjections(season, week, seasonType);
    const eligible = SLOT_POSITIONS[position] ?? [];
    return this.toWeekLines(
      projections.filter((row) => eligible.includes(row.player.position)),
      (row) => calculateNbaFantasyPoints(row.stats),
    ).map((line) => ({
      playerId: line.playerId,
      name: line.name,
      position: position as PlayerPosition,
      projectedPoints: line.bestGame,
      injuryStatus: line.injuryStatus,
      oppTeam: line.oppTeam,
      team: line.team,
    }));
  }

  /**
   * Returns every player's best game regardless of `position`: scores are
   * matched by player id, and a drafted player must still be scored if
   * Sleeper changes their eligibility mid-week.
   */
  async getStatistics(
    _season: number,
    eventGroup: EventGroup,
    _events: Event[],
    position: string,
  ): Promise<IPlayerStats[]> {
    const { seasonYear, seasonType, week } = parseNbaWeekName(eventGroup.name);
    const rows = await this.sleeperService.getNbaStatistics(seasonYear, week, seasonType);
    // Sleeper omits pts_std when it is 0; scoring the stat line with the same
    // weights gives that 0 and still scores a line if pts_std is ever missing.
    return this.toWeekLines(
      rows,
      (row) => row.stats.pts_std ?? calculateNbaFantasyPoints(row.stats),
    ).map((line) => ({
      playerId: line.playerId,
      name: line.name,
      position: position as PlayerPosition,
      points: line.bestGame,
      oppTeam: line.oppTeam,
      team: line.team,
    }));
  }

  /** Collapse per-game rows into one line per player, keeping the best game. */
  private toWeekLines<TStats>(
    projections: ISleeperNbaPlayerEntry<TStats>[],
    score: (row: ISleeperNbaPlayerEntry<TStats>) => number,
  ): NbaWeekLine[] {
    const byPlayer = new Map<string, ISleeperNbaPlayerEntry<TStats>[]>();
    for (const row of projections) {
      byPlayer.set(row.player_id, [...(byPlayer.get(row.player_id) ?? []), row]);
    }
    return [...byPlayer.values()].map((games) => {
      const sortedGames = [...games].sort((a, b) => a.date.localeCompare(b.date));
      const lastGame = sortedGames[sortedGames.length - 1];
      return {
        playerId: lastGame.player_id,
        name: `${lastGame.player.first_name} ${lastGame.player.last_name}`,
        team: lastGame.team,
        injuryStatus: lastGame.player.injury_status,
        oppTeam: sortedGames.map((game) => game.opponent).join(', '),
        bestGame: Math.max(...sortedGames.map(score)),
      };
    });
  }
}

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
    _season: number,
    eventGroup: EventGroup,
    _events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]> {
    const { seasonYear, seasonType, week } = parseNbaWeekName(eventGroup.name);
    const rows = await this.sleeperService.getNbaProjections(seasonYear, week, seasonType);
    const eligible = SLOT_POSITIONS[position] ?? [];
    return this.toWeekLines(
      rows.filter((row) => row.player.fantasy_positions.some((p) => eligible.includes(p))),
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
    return this.toWeekLines(rows, (row) => row.stats.pts_std).map((line) => ({
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
    rows: ISleeperNbaPlayerEntry<TStats>[],
    score: (row: ISleeperNbaPlayerEntry<TStats>) => number,
  ): NbaWeekLine[] {
    const byPlayer = new Map<string, ISleeperNbaPlayerEntry<TStats>[]>();
    for (const row of rows) {
      byPlayer.set(row.player_id, [...(byPlayer.get(row.player_id) ?? []), row]);
    }
    return [...byPlayer.values()].map((games) => {
      const ordered = [...games].sort((a, b) => a.date.localeCompare(b.date));
      const latest = ordered[ordered.length - 1];
      return {
        playerId: latest.player_id,
        name: `${latest.player.first_name} ${latest.player.last_name}`,
        team: latest.team,
        injuryStatus: latest.player.injury_status,
        oppTeam: ordered.map((game) => game.opponent).join(', '),
        bestGame: Math.max(...ordered.map(score)),
      };
    });
  }
}

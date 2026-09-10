import { Injectable } from '@nestjs/common';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { IPlayerStatsStrategy } from '@/player-stats/strategies/player-stats-strategy.interface';
import { IPlayerProjection, IPlayerStats, PlayerPosition } from '@/player-stats/entities/player-stats.entity';
import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';

@Injectable()
export class NflPlayerStatsStrategy implements IPlayerStatsStrategy {
  constructor(
    private readonly sleeperService: SleeperService,
    private readonly fanduelService: FanduelService,
  ) {}

  async getProjections(
    season: number,
    eventGroup: EventGroup,
    _events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]> {
    const week = this.getWeekNumberFromEventGroup(eventGroup.name);
    if (week === null) {
      throw new Error(`Cannot resolve NFL week number from event group: ${eventGroup.name}`);
    }

    const isPostseason = week > 18;
    if (isPostseason) {
      return this.getPostseasonProjections(position, week);
    }

    return this.getRegularSeasonProjections(position, season, week);
  }

  async getStatistics(
    season: number,
    eventGroup: EventGroup,
    _events: Event[],
    position: string,
  ): Promise<IPlayerStats[]> {
    const week = this.getWeekNumberFromEventGroup(eventGroup.name);
    if (week === null) {
      throw new Error(`Cannot resolve NFL week number from event group: ${eventGroup.name}`);
    }

    const isPostseason = week > 18;
    const sleeperStats = await this.sleeperService.getPlayerStatistics(
      position,
      season,
      isPostseason ? week - 18 : week,
      isPostseason ? 'post' : 'regular',
    );
    return sleeperStats.map((player) => ({
      playerId: player.player.metadata.genius_id,
      name: `${player.player.first_name} ${player.player.last_name}`,
      position: this.mapPosition(player.player.position),
      points: player.stats.pts_ppr,
      injuryStatus: player.player.injury_status ?? null,
      oppTeam: player.opponent,
      team: player.team,
    })) as IPlayerStats[];
  }

  private async getRegularSeasonProjections(
    position: string,
    season: number,
    week: number,
  ): Promise<IPlayerProjection[]> {
    const sleeperProjections = await this.sleeperService.getPlayerProjections(
      position,
      season,
      week,
    );
    return sleeperProjections.map((projection) => ({
      playerId: projection.player.metadata.genius_id,
      name: `${projection.player.first_name} ${projection.player.last_name}`,
      position: this.mapPosition(projection.player.position),
      projectedPoints: projection.stats.pts_ppr,
      injuryStatus: projection.player.injury_status ?? null,
      oppTeam: projection.opponent,
      team: projection.team,
    })) as IPlayerProjection[];
  }

  private async getPostseasonProjections(
    position: string,
    week: number,
  ): Promise<IPlayerProjection[]> {
    const fanduelProjections = await this.fanduelService.getNflProjections();
    const rawProjections: IPlayerProjection[] = fanduelProjections.map((projection) => ({
      playerId: `${projection.player.betGeniusId}`,
      name: projection.player.name,
      position: projection.player.position,
      projectedPoints: projection.fantasy,
      injuryStatus: null,
      oppTeam:
        projection.gameInfo.awayTeam.abbreviation === projection.team.abbreviation
          ? projection.gameInfo.homeTeam.abbreviation
          : projection.gameInfo.awayTeam.abbreviation,
      team: projection.team.abbreviation,
    }));

    if (week === 20) {
      const positionFilter = position === 'WR' ? [position] : [position, 'TE'];
      return rawProjections
        .filter((p) => positionFilter.includes(p.position))
        .filter((p) =>
          p.position === 'TE' ? p.projectedPoints >= 2.0 : p.projectedPoints >= 1.0,
        );
    }

    return rawProjections
      .filter((p) => p.position === position)
      .filter((p) => p.projectedPoints > 0.0);
  }

  private getWeekNumberFromEventGroup(eventGroupName: string): number | null {
    const match = eventGroupName.match(/Week\s+(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  }

  private mapPosition(position: string): PlayerPosition {
    switch (position) {
      case 'FB':
        return 'RB';
      case 'DEF':
        return 'DST';
      default:
        return position as PlayerPosition;
    }
  }
}

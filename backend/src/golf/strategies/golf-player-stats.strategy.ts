import { Injectable, Logger } from '@nestjs/common';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { IPlayerStatsStrategy } from '@/player-stats/strategies/player-stats-strategy.interface';
import { IPlayerProjection, IPlayerStats, PlayerPosition } from '@/player-stats/entities/player-stats.entity';
import { calculateGolferScore } from '@/golf/golf-scoring.util';
import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';

@Injectable()
export class GolfPlayerStatsStrategy implements IPlayerStatsStrategy {
  private readonly logger = new Logger(GolfPlayerStatsStrategy.name);

  constructor(
    private readonly fanduelService: FanduelService,
    private readonly espnService: EspnService,
  ) {}

  async getProjections(
    _season: number,
    _eventGroup: EventGroup,
    _events: Event[],
    _position: string,
  ): Promise<IPlayerProjection[]> {
    const golfProjections = await this.fanduelService.getGolfProjections();
    return golfProjections.map((projection) => ({
      playerId: `${projection.player.numberFireId}`,
      name: projection.player.name,
      position: 'GOLF_PLAYER' as PlayerPosition,
      projectedPoints: projection.fantasy,
      injuryStatus: null,
      team: '',
    }));
  }

  async getStatistics(
    season: number,
    eventGroup: EventGroup,
    _events: Event[],
    _position: string,
  ): Promise<IPlayerStats[]> {
    const leaderboard = await this.espnService.getTournamentLeaderboard(season, eventGroup.name);

    if (!leaderboard) {
      this.logger.warn(`No ESPN leaderboard found for "${eventGroup.name}"`);
      return [];
    }

    return leaderboard.competitors.map((competitor) => ({
      playerId: competitor.athleteName,
      name: competitor.athleteName,
      position: 'GOLF_PLAYER' as PlayerPosition,
      //TODO should calculate golfer score be a method in here?
      points: calculateGolferScore(competitor),
      team: '',
    }));
  }
}

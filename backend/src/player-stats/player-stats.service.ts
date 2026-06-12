import { EventsService } from '@/events/events.service';
import { SportLeague } from '@/common/types/sport-league.type';
import {
  IPlayerProjection,
  PlayerProjectionResponse,
  PlayerStatResponse,
  PlayerTeams,
} from '@/player-stats/entities/player-stats.entity';
import { Injectable } from '@nestjs/common';
import { PlayerStatsStrategyRegistry } from './strategies/player-stats-strategy.registry';

@Injectable()
export class PlayerStatsService {
  private playerTeams = new Map<string, PlayerTeams>();

  constructor(
    private readonly eventsService: EventsService,
    private readonly playerStatsRegistry: PlayerStatsStrategyRegistry,
  ) {}

  async getPlayerProjections(
    position: string,
    season: number,
    eventGroupId: string,
    sportLeague: SportLeague = 'NFL',
  ): Promise<PlayerProjectionResponse> {
    const strategy = this.playerStatsRegistry.get(sportLeague);
    const eventGroup = await this.eventsService.findOneEventGroup(eventGroupId);
    const events = await this.eventsService.findEventsByEventGroup(eventGroupId);
    const projections = await strategy.getProjections(season, eventGroup, events, position);
    projections.forEach(this.setPlayerTeamMappings, this);
    return projections;
  }

  async getPlayerStatistics(
    position: string,
    season: number,
    eventGroupId: string,
    sportLeague: SportLeague = 'NFL',
  ): Promise<PlayerStatResponse> {
    const strategy = this.playerStatsRegistry.get(sportLeague);
    const eventGroup = await this.eventsService.findOneEventGroup(eventGroupId);
    const events = await this.eventsService.findEventsByEventGroup(eventGroupId);
    return strategy.getStatistics(season, eventGroup, events, position);
  }

  getTeamAndOpponentForPlayer(playerId: string): PlayerTeams {
    const matchup = this.playerTeams.get(playerId);
    if (!matchup) {
      return {
        team: 'NA',
        opponent: 'NA',
      };
    }
    return matchup;
  }

  private setPlayerTeamMappings(projection: IPlayerProjection) {
    this.playerTeams.set(projection.playerId, {
      team: projection.team,
      opponent: projection.oppTeam!,
    });
  }
}

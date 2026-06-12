import { EventGroup } from '@/events/entities/event-group.entity';
import { Event } from '@/events/entities/event.entity';
import { IPlayerProjection, IPlayerStats } from '@/player-stats/entities/player-stats.entity';

export interface IPlayerStatsStrategy {
  getProjections(
    season: number,
    eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerProjection[]>;

  getStatistics(
    season: number,
    eventGroup: EventGroup,
    events: Event[],
    position: string,
  ): Promise<IPlayerStats[]>;
}

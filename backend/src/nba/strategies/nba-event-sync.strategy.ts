import { SportLeague } from '@/common/types/sport-league.type';
import {
  EventSyncGroup,
  IEventSyncStrategy,
} from '@/events/strategies/event-sync-strategy.interface';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { buildNbaWeekName, NbaSeasonType } from '@/nba/nba-week.util';
import { Injectable } from '@nestjs/common';

@Injectable()
export class NbaEventSyncStrategy implements IEventSyncStrategy {
  constructor(private readonly sleeperService: SleeperService) {}

  /**
   * Syncs the current Sleeper NBA week and the next one, so a week can be
   * drafted before its first game. Before the season starts this is week 1.
   * Each game becomes an event in its week's group; canceled games are
   * skipped, and weeks with no games (e.g. the week after the regular season
   * ends) produce no group.
   */
  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const state = await this.sleeperService.getStateForSport(SportLeague.NBA);
    const seasonYear = Number(state.season);

    let seasonType: NbaSeasonType;
    let weeks: number[];
    if (state.season_type === 'pre') {
      seasonType = 'regular';
      weeks = [1];
    } else if (state.season_type === 'regular' || state.season_type === 'post') {
      seasonType = state.season_type;
      weeks = [state.week, state.week + 1];
    } else {
      return [];
    }

    const schedule = await this.sleeperService.getScheduleForSport(
      SportLeague.NBA,
      seasonYear,
      seasonType,
    );
    return weeks.flatMap((week) => {
      const games = schedule.filter((game) => game.week === week && game.status !== 'canceled');
      if (games.length === 0) return [];
      return [
        {
          name: buildNbaWeekName({ seasonYear, seasonType, week }),
          seasonYear,
          events: games.map((game) => ({
            externalId: game.game_id,
            externalSource: 'SLEEPER',
            name: `${game.away} @ ${game.home}`,
            startDate: game.date,
            endDate: game.date,
          })),
        },
      ];
    });
  }
}

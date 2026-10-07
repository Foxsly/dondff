import { Injectable } from '@nestjs/common';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import {
  IEventSyncStrategy,
  EventSyncGroup,
} from '@/events/strategies/event-sync-strategy.interface';
import { buildNbaWeekName, NbaWeek } from '@/nba/nba-week.util';

@Injectable()
export class NbaEventSyncStrategy implements IEventSyncStrategy {
  constructor(private readonly sleeperService: SleeperService) {}

  /**
   * Syncs the current Sleeper NBA week and the next one, so a week can be
   * drafted before its first game. Before the season starts this is week 1.
   * Each game becomes an event in its week's group; weeks with no games
   * (e.g. the week after the regular season ends) produce no group.
   */
  async fetchSyncData(): Promise<EventSyncGroup[]> {
    const state = await this.sleeperService.getNbaState();
    const seasonYear = Number(state.season);

    let weeks: NbaWeek[];
    if (state.season_type === 'pre') {
      weeks = [{ seasonYear, seasonType: 'regular', week: 1 }];
    } else if (state.season_type === 'regular' || state.season_type === 'post') {
      const seasonType = state.season_type;
      weeks = [state.week, state.week + 1].map((week) => ({ seasonYear, seasonType, week }));
    } else {
      return [];
    }

    const groups: EventSyncGroup[] = [];
    for (const week of weeks) {
      const games = await this.sleeperService.getNbaWeekGames(
        seasonYear,
        week.week,
        week.seasonType,
      );
      if (games.length === 0) continue;
      groups.push({
        name: buildNbaWeekName(week),
        seasonYear,
        events: games.map((game) => ({
          externalId: game.game_id,
          externalSource: 'SLEEPER',
          name: `${game.metadata.away_team.team} @ ${game.metadata.home_team.team}`,
          startDate: game.date,
          endDate: game.date,
        })),
      });
    }
    return groups;
  }
}

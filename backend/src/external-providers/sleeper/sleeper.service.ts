import { SportLeague } from '@/common/types/sport-league.type';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';
import {
  ISleeperPlayerEntry,
  ISleeperState,
  SleeperNbaProjectionResponse,
  SleeperNbaScheduleResponse,
  SleeperNbaStatResponse,
  SleeperNflScheduleResponse,
  SleeperProjectionResponse,
  SleeperStatResponse,
} from './entities/sleeper.entity';

@Injectable()
export class SleeperService {
  private readonly BASE_URL = 'https://api.sleeper.app';
  private readonly SCHEDULE_URL = 'https://api.sleeper.com/schedule';

  // Create transformer functions
  private assertSleeperStats = typia.misc.createAssertPrune<SleeperStatResponse>();
  private assertSleeperProjections = typia.misc.createAssertPrune<SleeperProjectionResponse>();
  private assertSleeperNbaProjections = typia.misc.createAssertPrune<SleeperNbaProjectionResponse>();
  private assertSleeperNbaStats = typia.misc.createAssertPrune<SleeperNbaStatResponse>();
  private assertSleeperNflSchedule = typia.misc.createAssertPrune<SleeperNflScheduleResponse>();
  private assertSleeperNbaSchedule = typia.misc.createAssertPrune<SleeperNbaScheduleResponse>();
  private assertSleeperState = typia.misc.createAssertPrune<ISleeperState>();

  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
  ) {}

  async getStateForSport(sport: SportLeague = SportLeague.NFL): Promise<ISleeperState> {
    const response$ = this.httpService.get(`${this.BASE_URL}/v1/state/${sport.toLowerCase()}`);
    const response = await lastValueFrom(response$);
    const sleeperState: ISleeperState = response.data;

    if (process.env.NODE_ENV === 'development') {
      const devWeek = process.env.DEV_WEEK ? Number(process.env.DEV_WEEK) : 14;
      const devSeason = process.env.DEV_SEASON_YEAR ?? '2025';
      if (devWeek !== null && devSeason !== null) {
        sleeperState.week = devWeek;
        sleeperState.display_week = devWeek;
        sleeperState.season = devSeason;
        sleeperState.league_season = devSeason;
        sleeperState.season_type = 'regular';
        return sleeperState;
      }
    }

    if (sport === SportLeague.NFL && sleeperState.season_type === 'post') {
      sleeperState.week = sleeperState.week + 18;
    }
    return this.assertSleeperState(sleeperState);
  }

  /**
   * Every game in an NFL season, each tagged with its Sleeper week (playoff
   * weeks restart at 1). Includes canceled games, such as playoff placeholders.
   */
  async getNflSchedule(
    season: number,
    seasonType: 'regular' | 'post',
  ): Promise<SleeperNflScheduleResponse> {
    const response$ = this.httpService.get(`${this.SCHEDULE_URL}/nfl/${seasonType}/${season}`);
    const response = await lastValueFrom(response$);
    return this.assertSleeperNflSchedule(response.data);
  }

  async getPlayerProjections(
    position: string,
    season: number,
    week: number,
  ): Promise<SleeperProjectionResponse> {
    const url = `${this.BASE_URL}/projections/nfl/${season}/${week}?season_type=regular&position=${position}&order_by=pts_ppr`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    return this.assertSleeperProjections(
      this.transformSleeperEntries(
        response.data.filter((entry) => entry?.stats?.pts_ppr && entry.player.metadata.genius_id),
      ),
    );
  }

  async getPlayerStatistics(
    position: string,
    season: number,
    week: number,
    seasonType: string = 'regular',
  ): Promise<SleeperStatResponse> {
    const url = `${this.BASE_URL}/stats/nfl/${season}/${week}?season_type=${seasonType}&position=${position}&order_by=pts_ppr`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    return this.assertSleeperStats(
      this.transformSleeperEntries(
        response.data
          .filter((entry) => entry.player.metadata.genius_id)
          .map((entry) => ({
            ...entry,
            stats: {
              ...entry.stats,
              pts_std: entry.stats?.pts_std ?? 0,
              pts_half_ppr: entry.stats?.pts_half_ppr ?? 0,
              pts_ppr: entry.stats?.pts_ppr ?? 0,
            },
          })),
      ),
    );
  }

  /**
   * Every game in an NBA season, each tagged with its Sleeper fantasy week
   * (Monday–Sunday). Includes canceled and postponed games.
   */
  async getNbaSchedule(
    season: number,
    seasonType: 'regular' | 'post',
  ): Promise<SleeperNbaScheduleResponse> {
    const response$ = this.httpService.get(`${this.SCHEDULE_URL}/nba/${seasonType}/${season}`);
    const response = await lastValueFrom(response$);
    return this.assertSleeperNbaSchedule(response.data);
  }

  /**
   * Per-game projections (one row per player per game) for an NBA week.
   * Team rows and rows without a projected stat line are dropped.
   */
  async getNbaProjections(
    season: number,
    week: number,
    seasonType: 'regular' | 'post' = 'regular',
  ): Promise<SleeperNbaProjectionResponse> {
    const url = `${this.BASE_URL}/projections/nba/${season}/${week}?season_type=${seasonType}`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    return this.assertSleeperNbaProjections(
      this.transformSleeperEntries(
        response.data.filter(
          (entry) => entry?.player?.position !== 'TEAM' && Object.keys(entry?.stats ?? {}).length > 0,
        ),
      ),
    );
  }

  /**
   * Per-game statistics (one row per player per game) for an NBA week.
   * Team rows are dropped. Every row must carry a stat object; a player listed
   * for a game they did not play has an empty one.
   */
  async getNbaStatistics(
    season: number,
    week: number,
    seasonType: 'regular' | 'post' = 'regular',
  ): Promise<SleeperNbaStatResponse> {
    const url = `${this.BASE_URL}/stats/nba/${season}/${week}?season_type=${seasonType}`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    return this.assertSleeperNbaStats(
      this.transformSleeperEntries(response.data.filter((entry) => entry?.player?.position !== 'TEAM')),
    );
  }

  /**
   * Generic transformer: raw JSON -> domain type with Dates and numbers
   */
  private transformSleeperEntries<TStats>(raw: unknown[]): ISleeperPlayerEntry<TStats>[] {
    return raw.map((entry: any) => ({
      ...entry,
      season: Number(entry.season),
      date: new Date(entry.date),
      last_modified: new Date(entry.last_modified),
      updated_at: new Date(entry.updated_at),
    }));
  }
}

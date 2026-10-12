import { SportLeague } from '@/common/types/sport-league.type';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';
import {
  ISleeperNbaBoxStats,
  ISleeperNbaGameStats,
  ISleeperPlayerEntry,
  ISleeperState,
  SleeperNbaScheduleResponse,
  SleeperNbaScoredResponse,
  SleeperNflScheduleResponse,
  SleeperProjectionResponse,
  SleeperStatResponse,
} from './entities/sleeper.entity';

/**
 * Sleeper's default NBA points scoring ("pts_std"). Sleeper returns `pts_std`
 * on actual stat lines but not on projections, so projections are scored here
 * with the same weights. The weights reproduce Sleeper's `pts_std` exactly for
 * completed games (rebound and assist bonuses are worth 0 in that format). On a
 * projection, `dd`/`td` are probabilities, so they contribute their expected
 * value; Sleeper does not project the 40/50-point bonuses, so those contribute
 * nothing there.
 */
const NBA_STD_SCORING: Readonly<Record<keyof ISleeperNbaBoxStats, number>> = {
  pts: 0.5,
  reb: 1,
  ast: 1,
  stl: 2,
  blk: 2,
  to: -1,
  tpm: 0.5,
  dd: 1,
  td: 2,
  bonus_pt_40p: 2,
  bonus_pt_50p: 2,
};

/** Fantasy points for one game's stat line, rounded to 2 decimal places. */
const calculateNbaFantasyPoints = (stats: ISleeperNbaBoxStats): number => {
  const total = (Object.keys(NBA_STD_SCORING) as (keyof ISleeperNbaBoxStats)[]).reduce(
    (sum, stat) => sum + (stats[stat] ?? 0) * NBA_STD_SCORING[stat],
    0,
  );
  return Math.round(total * 100) / 100;
};

@Injectable()
export class SleeperService {
  private readonly BASE_URL = 'https://api.sleeper.app';
  private readonly SCHEDULE_URL = 'https://api.sleeper.com/schedule';

  // Create transformer functions
  private assertSleeperStats = typia.misc.createAssertPrune<SleeperStatResponse>();
  private assertSleeperProjections = typia.misc.createAssertPrune<SleeperProjectionResponse>();
  private assertSleeperNbaScored = typia.misc.createAssertPrune<SleeperNbaScoredResponse>();
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
  ): Promise<SleeperNbaScoredResponse> {
    const url = `${this.BASE_URL}/projections/nba/${season}/${week}?season_type=${seasonType}`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    const projections = this.transformSleeperEntries<ISleeperNbaBoxStats>(
      response.data.filter(
        (entry) => entry?.player?.position !== 'TEAM' && Object.keys(entry?.stats ?? {}).length > 0,
      ),
    );
    return this.assertSleeperNbaScored(
      projections.map((row) => ({
        ...row,
        stats: { pts_std: calculateNbaFantasyPoints(row.stats) },
      })),
    );
  }

  /**
   * Per-game statistics (one row per player per game) for an NBA week.
   * Team rows are dropped. Every row must carry a stat object; a player listed
   * for a game they did not play has an empty one. Sleeper omits `pts_std`
   * when it is 0, so it is defaulted to 0 here and callers always get a number.
   */
  async getNbaStatistics(
    season: number,
    week: number,
    seasonType: 'regular' | 'post' = 'regular',
  ): Promise<SleeperNbaScoredResponse> {
    const url = `${this.BASE_URL}/stats/nba/${season}/${week}?season_type=${seasonType}`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    const rows = this.transformSleeperEntries<ISleeperNbaGameStats>(
      response.data.filter((entry) => entry?.player?.position !== 'TEAM'),
    );
    return this.assertSleeperNbaScored(
      rows.map((row) => ({
        ...row,
        stats: { pts_std: row.stats.pts_std ?? 0 },
      })),
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

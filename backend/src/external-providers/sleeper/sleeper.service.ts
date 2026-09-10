import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  ISleeperPlayerEntry,
  ISleeperState,
  SleeperProjectionResponse,
  SleeperScoresResponse,
  SleeperStatResponse,
} from './entities/sleeper.entity';
import typia from 'typia';

@Injectable()
export class SleeperService {
  private readonly BASE_URL = 'https://api.sleeper.app';
  private readonly GRAPHQL_URL = 'https://sleeper.com/graphql';

  // Create transformer functions
  private assertSleeperStats = typia.misc.createAssertPrune<SleeperStatResponse>();
  private assertSleeperProjections = typia.misc.createAssertPrune<SleeperProjectionResponse>();
  private assertSleeperScores = typia.misc.createAssertPrune<SleeperScoresResponse>();

  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
  ) {}

  async getNflState(): Promise<ISleeperState> {
    const response$ = this.httpService.get(`${this.BASE_URL}/v1/state/nfl`);
    const response = await lastValueFrom(response$);
    const sleeperState: ISleeperState = response.data;

    if (process.env.NODE_ENV === 'development' && false) {
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

    if (sleeperState.season_type === 'post') {
      sleeperState.week = sleeperState.week + 18;
    }
    return sleeperState;
  }

  async getNflWeekGameDates(
    season: number,
    week: number,
    seasonType: 'regular' | 'post',
  ): Promise<string[]> {
    const query = `query batch_scores { scores(sport: "nfl", season_type: "${seasonType}", season: "${season}", week: ${week}) { date status } }`;
    const response$ = this.httpService.post(this.GRAPHQL_URL, { query });
    const response = await lastValueFrom(response$);
    const scores = this.assertSleeperScores(response.data).data.scores;
    return scores.map((score) => score.date).filter((date) => date.trim().length > 0);
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
        response.data.filter(
          (entry) => entry?.stats?.pts_ppr && entry.player.metadata.genius_id,
        ),
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

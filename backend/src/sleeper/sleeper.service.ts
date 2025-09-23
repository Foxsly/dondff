import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import {
  ISleeperPlayerEntry,
  ISleeperState,
  SleeperProjectionResponse,
  SleeperStatResponse,
} from './entities/sleeper.entity';
import typia from 'typia';

@Injectable()
export class SleeperService {
  private readonly BASE_URL = 'https://api.sleeper.app';

  // Create transformer functions
  private assertSleeperStats = typia.createAssert<SleeperStatResponse>();
  private assertSleeperProjections = typia.createAssert<SleeperProjectionResponse>();

  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
  ) {}

  async getNflState(): Promise<ISleeperState> {
    const response$ = this.httpService.get(`${this.BASE_URL}/v1/state/nfl`);
    const response = await lastValueFrom(response$);
    return response.data;
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
          (entry: { stats: { pts_ppr: undefined } }) => entry?.stats?.pts_ppr !== undefined,
        ),
      ),
    );
  }

  async getPlayerStatistics(
    position: string,
    season: number,
    week: number,
  ): Promise<SleeperStatResponse> {
    const url = `${this.BASE_URL}/stats/nfl/${season}/${week}?season_type=regular&position=${position}&order_by=pts_ppr`;
    const response$ = this.httpService.get(url);
    const response = await lastValueFrom(response$);
    return this.assertSleeperStats(
      this.transformSleeperEntries(
        response.data.map((entry) => ({
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

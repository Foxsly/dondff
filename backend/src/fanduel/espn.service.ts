import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

export interface EspnTournament {
  name: string;
  startDate: string;
  endDate: string;
  state: 'pre' | 'in' | 'post';
}

@Injectable()
export class EspnService {
  private readonly logger = new Logger(EspnService.name);

  constructor(@Inject(HttpService) private readonly httpService: HttpService) {}

  async getPgaSchedule(year: number | string): Promise<EspnTournament[]> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${year}`;
    try {
      const response$ = this.httpService.get(url);
      const response = await lastValueFrom(response$);
      const events = response?.data?.events;
      if (!Array.isArray(events)) return [];

      return events.map((event: any) => ({
        name: event.name ?? '',
        startDate: event.date ?? '',
        endDate: event.endDate ?? event.date ?? '',
        state: event.status?.type?.state ?? 'pre',
      }));
    } catch (err) {
      this.logger.error('Failed to fetch ESPN PGA schedule', err);
      return [];
    }
  }
}

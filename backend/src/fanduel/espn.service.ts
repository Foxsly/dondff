import { HttpService } from '@nestjs/axios';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import {
  EspnCompetitor,
  EspnHoleScore,
  EspnRoundScore,
  normalizeName,
} from '@/player-stats/golf-scoring.util';

export interface EspnTournament {
  name: string;
  startDate: string;
  endDate: string;
  state: 'pre' | 'in' | 'post';
}

export interface EspnLeaderboard {
  tournamentName: string;
  competitors: EspnCompetitor[];
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

  async getTournamentLeaderboard(
    year: number | string,
    tournamentName: string,
  ): Promise<EspnLeaderboard | null> {
    const url = `https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard?dates=${year}`;
    try {
      const response$ = this.httpService.get(url);
      const response = await lastValueFrom(response$);
      const events = response?.data?.events;
      if (!Array.isArray(events)) return null;

      const normalizedTarget = normalizeName(tournamentName);
      const event = events.find(
        (e: any) => normalizeName(e.name ?? '').includes(normalizedTarget)
          || normalizedTarget.includes(normalizeName(e.name ?? '')),
      );

      if (!event) {
        this.logger.warn(`ESPN tournament not found: "${tournamentName}" (normalized: "${normalizedTarget}")`);
        return null;
      }

      const competition = event.competitions?.[0];
      if (!competition) return null;

      const competitors: EspnCompetitor[] = (competition.competitors ?? []).map(
        (c: any) => {
          const rounds: EspnRoundScore[] = (c.linescores ?? []).map(
            (round: any) => ({
              roundNumber: round.period ?? 0,
              holes: (round.linescores ?? []).map(
                (hole: any): EspnHoleScore => ({
                  holeNumber: hole.period ?? 0,
                  scoreType: hole.scoreType?.displayValue ?? 'OTHER',
                }),
              ),
            }),
          );

          return {
            athleteName: c.athlete?.displayName ?? '',
            position: typeof c.order === 'number' ? c.order : null,
            rounds,
          };
        },
      );

      return {
        tournamentName: event.name ?? tournamentName,
        competitors,
      };
    } catch (err) {
      this.logger.error(`Failed to fetch ESPN leaderboard for "${tournamentName}"`, err);
      return null;
    }
  }
}

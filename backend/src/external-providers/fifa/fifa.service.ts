import { shuffle } from '@/common/util';
import { Inject, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';
import type {
  FifaPlayerResponse,
  FifaRoundProjectionResponse,
  FifaRoundResponse,
  FifaSquadResponse,
} from './entities/fifa.entity';

@Injectable()
export class FifaService {
  private readonly BASE_URL = 'https://play.fifa.com/json/fantasy';

  private assertRounds = typia.misc.createAssertPrune<FifaRoundResponse>();
  private assertPlayers = typia.misc.createAssertPrune<FifaPlayerResponse>();
  private assertSquads = typia.misc.createAssertPrune<FifaSquadResponse>();

  constructor(
    @Inject(HttpService)
    private readonly httpService: HttpService,
  ) {}

  async getRounds(): Promise<FifaRoundResponse> {
    const response$ = this.httpService.get(`${this.BASE_URL}/rounds.json`);
    const response = await lastValueFrom(response$);
    return this.assertRounds(response.data);
  }

  async getPlayers(): Promise<FifaPlayerResponse> {
    const response$ = this.httpService.get(`${this.BASE_URL}/players.json`);
    const response = await lastValueFrom(response$);

    // Normalize roundPoints: API returns [] when no data, but our model uses Record<string, number>
    const raw = response.data as { stats: { roundPoints: unknown } }[];
    const normalized = raw.map(p => ({
      ...p,
      stats: {
        ...p.stats,
        roundPoints: Array.isArray(p.stats.roundPoints) ? ({} as Record<string, number>) : p.stats.roundPoints,
      },
    }));

    return this.assertPlayers(normalized);
  }

  async getSquads(): Promise<FifaSquadResponse> {
    const response$ = this.httpService.get(`${this.BASE_URL}/squads.json`);
    const response = await lastValueFrom(response$);
    return this.assertSquads(response.data);
  }

  async getRoundProjections(roundId: number): Promise<FifaRoundProjectionResponse> {
    const [rounds, players, squads] = await Promise.all([
      this.getRounds(),
      this.getPlayers(),
      this.getSquads(),
    ]);

    const round = rounds.find((round) => round.id === roundId);
    if (!round) {
      return [];
    }

    const squadIdsInRound = new Set<number>();
    for (const match of round.tournaments) {
      squadIdsInRound.add(match.homeSquadId);
      squadIdsInRound.add(match.awaySquadId);
    }

    const squadMap = new Map(squads.map((squad) => [squad.id, squad]));
    const matchBySquadId = new Map<number, (typeof round.tournaments)[number]>();
    for (const match of round.tournaments) {
      matchBySquadId.set(match.homeSquadId, match);
      matchBySquadId.set(match.awaySquadId, match);
    }

    const projections: FifaRoundProjectionResponse = [];
    for (const player of players) {
      if (!squadIdsInRound.has(player.squadId)) {
        continue;
      }

      const squad = squadMap.get(player.squadId);
      const match = matchBySquadId.get(player.squadId);
      if (!squad || !match) {
        continue;
      }

      const opponent =
        player.squadId === match.homeSquadId
          ? match.awaySquadName
          : match.homeSquadName;

      projections.push({
        id: player.id,
        firstName: player.firstName,
        lastName: player.lastName,
        knownName: player.knownName,
        position: player.position,
        price: player.price,
        status: player.status,
        fantasyPoints: player.stats.roundPoints[roundId] ?? 0,
        team: squad.name,
        opponent,
        matchDate: match.date,
        group: squad.group,
      });
    }

    return shuffle(projections).sort((a, b) => b.price - a.price);
  }
}

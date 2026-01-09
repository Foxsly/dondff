import {
  FanduelProjectionsResponse,
} from '@/fanduel/entities/fanduel.entity';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';

@Injectable()
export class FanduelService {
  private readonly BASE_URL = 'https://fdresearch-api.fanduel.com/graphql';

  // Create transformer functions
  private assertFanduelProjections = typia.misc.createAssertPrune<FanduelProjectionsResponse>();

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
  ) {}

  async getFanduelProjections(): Promise<FanduelProjectionsResponse> {
    const requestBody = {
      query:
        'query GetProjections($input: ProjectionsInput!) {\n'+
        '  getProjections(input: $input) {\n'+
        '    ... on NflSkill {\n'+
        '      fantasy\n'+
        '      gameInfo {\n'+
        '        awayTeam {\n'+
        '          abbreviation\n'+
        '          name\n'+
        '        }\n'+
        '        homeTeam {\n'+
        '          abbreviation\n'+
        '          name\n'+
        '        }\n'+
        '      }\n'+
        '      player {\n'+
        '        name\n'+
        '        betGeniusId\n'+
        '        position\n'+
        '      }\n'+
        '      team {\n'+
        '        name\n'+
        '        abbreviation\n'+
        '      }\n'+
        '    }\n'+
        '  }\n'+
        '}',
      variables: {
        input: {
          type: 'PPR',
          position: 'NFL_SKILL',
          sport: 'NFL',
        },
      },
      operationName: 'GetProjections',
    };
    const response$ = this.httpService.post(`${this.BASE_URL}`, requestBody);
    const response = await lastValueFrom(response$);

    const projections = response.data.data.getProjections;
    const nonZeroScoringPlayers = projections.filter(
      (entry) => entry?.fantasy >= 0,
    );
    return this.assertFanduelProjections(nonZeroScoringPlayers);
  }
}

import {
  FanduelGolfEventsResponse,
  FanduelGolfProjectionsResponse,
  FanduelGolfSlatesResponse,
} from '@/fanduel/entities/fanduel-golf.entity';
import { FanduelNflProjectionsResponse } from '@/fanduel/entities/fanduel-nfl.entity';
import { HttpService } from '@nestjs/axios';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import typia from 'typia';

@Injectable()
export class FanduelService {
  private readonly BASE_URL = 'https://fdresearch-api.fanduel.com/graphql';

  constructor(@Inject(HttpService) private readonly httpService: HttpService) {}

  private assertGolfProjections = typia.misc.createAssertPrune<FanduelGolfProjectionsResponse>();
  private buildGetProjectionsQuery(fragment: string): string {
    return `
      query GetProjections($input: ProjectionsInput!) {
        getProjections(input: $input) {
          ${fragment}
        }
      }
    `;
  }

  private assertGolfEvents = typia.misc.createAssertPrune<FanduelGolfEventsResponse>();
  private assertGolfSlates = typia.misc.createAssertPrune<FanduelGolfSlatesResponse>();

  /**
   * TODO - I think this should loop through all available events, and return an array of `FanduelGolfProjectionResponse`
   * Each object in that array would be an event, and should also contain the eventId and slateId
   * ^ Especially because if you don't pass in an eventId/slateId, it defaults, but you wouldn't necessarily know what it's defaulting to
   */
  async getGolfProjections(
    eventId?: string,
    slateId = '1',
  ): Promise<FanduelGolfProjectionsResponse> {
    if (!eventId) {
      const events = await this.getGolfEvents();
      if (events.length === 0) {
        throw new BadRequestException('No golf events available from FanDuel');
      }
      eventId = events[0].id;
    }

    const requestBody = {
      query: this.buildGetProjectionsQuery(this.GOLF.request),
      variables: { input: { ...this.GOLF.input, eventId: eventId, slateId: slateId } },
      operationName: 'GetProjections',
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);
    const payload = response?.data;
    const projections = payload?.data?.getProjections;
    const filtered = projections.filter((projection) => projection?.salary && projection.salary !== 'N/A');
    return this.assertGolfProjections(filtered);
  }

  async getGolfEvents(): Promise<FanduelGolfEventsResponse> {
    const requestBody = {
      query: `
      query GetGolfEvents {
        getGolfEvents {
          id
          name
        }
      }
    `,
      operationName: 'GetGolfEvents',
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);
    const payload = response?.data;

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new BadRequestException({
        message: 'FanDuel GraphQL error',
        operation: 'GetGolfEvents',
        errors: payload.errors.map((e: any) => ({ message: e?.message, path: e?.path })),
      });
    }

    const events = payload?.data?.getGolfEvents;
    if (!Array.isArray(events)) {
      throw new BadRequestException({
        message: 'Unexpected response shape from FanDuel GraphQL',
        operation: 'GetGolfEvents',
        rawData: payload?.data,
      });
    }

    return this.assertGolfEvents(events);
  }

  async getGolfSlates(): Promise<FanduelGolfSlatesResponse> {
    const requestBody = {
      query: `
      query GetSlates {
        getSlates(sport: GOLF) {
          id
          name
        }
      }
    `,
      operationName: 'GetSlates',
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);
    const payload = response?.data;

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new BadRequestException({
        message: 'FanDuel GraphQL error',
        operation: 'GetSlates',
        errors: payload.errors.map((e: any) => ({ message: e?.message, path: e?.path })),
      });
    }

    const slates = payload?.data?.getSlates;
    if (!Array.isArray(slates)) {
      throw new BadRequestException({
        message: 'Unexpected response shape from FanDuel GraphQL',
        operation: 'GetSlates',
        rawData: payload?.data,
      });
    }

    return this.assertGolfSlates(slates);
  }

  async getNflProjections(): Promise<FanduelNflProjectionsResponse> {
    //TODO make this method work
    return Promise.all([]);
  }

  //TODO determine if we need to keep this, or just inline it all
  GOLF = {
    input: { type: 'DAILY', position: 'GOLF_PLAYER', sport: 'GOLF' },
    request: `
      ... on GolfPlayer {
        fantasy
        salary
        player { name numberFireId imageUrl }
      }
    `,
  };
}

import { HttpService } from "@nestjs/axios";
import { Inject, Injectable, BadRequestException } from "@nestjs/common";
import { lastValueFrom } from "rxjs";

import {
  fanduelProjectionsConfig,
  FanduelSport,
  FanduelProjectionsBySport,
  ProjectionsInput
} from "./fanduel.projections.config";

import typia from "typia";
import { FanduelGolfEventsResponse, FanduelGolfSlatesResponse } from "./entities/fanduel-golf-lookups.entity";


@Injectable()
export class FanduelService {
  private readonly BASE_URL = "https://fdresearch-api.fanduel.com/graphql";

  constructor(@Inject(HttpService) private readonly httpService: HttpService) {}

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

  async getProjectionsBySport<K extends FanduelSport>(
      sport: K,
      overrides?: Partial<ProjectionsInput>,
  ): Promise<FanduelProjectionsBySport[K]> {
    const config = fanduelProjectionsConfig[sport];
    if (!config) throw new BadRequestException(`Unsupported sport: ${sport}`);

    // ✅ validate against the input you are actually sending
    let input = { ...config.input, ...(overrides ?? {}) };

    if (sport === 'GOLF') {
      // slateId default
      if (input.slateId == null || input.slateId === '') {
        input = { ...input, slateId: '1' };
      }

      // eventId default
      if (input.eventId == null || input.eventId === '') {
        const events = await this.getGolfEvents();
        const first = events?.[0];
        if (!first?.id) {
          throw new BadRequestException({
            message: 'No golf events available from FanDuel',
            sport,
            input,
          });
        }
        input = { ...input, eventId: first.id };
      }
    }

    for (const key of config.requiredInputKeys ?? []) {
      const value = input[key];
      if (value == null || value === '') {
        throw new BadRequestException({
          message: `Missing required FanDuel input field: ${key}`,
          sport,
          input,
        });
      }
    }

    const requestBody = {
      query: this.buildGetProjectionsQuery(config.fragment),
      variables: { input },
      operationName: "GetProjections",
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);

    const payload = response?.data;

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new BadRequestException({
        message: 'FanDuel GraphQL error',
        sport,
        input,
        errors: payload.errors.map((e: any) => ({
          message: e?.message,
          path: e?.path,
          extensions: e?.extensions,
        })),
      });
    }

    const projections = payload?.data?.getProjections;

    if (projections == null) {
      throw new BadRequestException({
        message: 'FanDuel returned null for getProjections',
        sport,
        input,
        rawData: payload?.data,
      });
    }

    if (!Array.isArray(projections)) {
      throw new BadRequestException({
        message: 'FanDuel returned non-array getProjections',
        sport,
        input,
        typeof: typeof projections,
        valuePreview: projections,
      });
    }

    const filtered = config.filter ? config.filter(projections) : projections;
    return config.assert(filtered);
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
      operationName: "GetGolfEvents",
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);
    const payload = response?.data;

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new BadRequestException({
        message: "FanDuel GraphQL error",
        operation: "GetGolfEvents",
        errors: payload.errors.map((e: any) => ({ message: e?.message, path: e?.path })),
      });
    }

    const events = payload?.data?.getGolfEvents;
    if (!Array.isArray(events)) {
      throw new BadRequestException({
        message: "Unexpected response shape from FanDuel GraphQL",
        operation: "GetGolfEvents",
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
      operationName: "GetSlates",
    };

    const response$ = this.httpService.post(this.BASE_URL, requestBody);
    const response = await lastValueFrom(response$);
    const payload = response?.data;

    if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
      throw new BadRequestException({
        message: "FanDuel GraphQL error",
        operation: "GetSlates",
        errors: payload.errors.map((e: any) => ({ message: e?.message, path: e?.path })),
      });
    }

    const slates = payload?.data?.getSlates;
    if (!Array.isArray(slates)) {
      throw new BadRequestException({
        message: "Unexpected response shape from FanDuel GraphQL",
        operation: "GetSlates",
        rawData: payload?.data,
      });
    }

    return this.assertGolfSlates(slates);
  }

}

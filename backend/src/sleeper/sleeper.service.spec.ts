import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { SleeperService } from './sleeper.service';
import {
  SleeperProjectionResponse,
  SleeperStatResponse,
} from './entities/sleeper.entity';
import stateFixture from './__fixtures__/sleeper-state.test.json';
import rawProjectionsFixture from './__fixtures__/sleeper-projections.raw.test.json';
import projectionsFixture from './__fixtures__/sleeper-projections.transformed.test.json';
import rawStatsFixture from './__fixtures__/sleeper-stats.raw.test.json';
import statsFixture from './__fixtures__/sleeper-stats.transformed.test.json';
import { AxiosResponse } from 'axios';

describe('SleeperService', () => {
  let service: SleeperService;
  let httpService: jest.Mocked<HttpService>;

  const mockState = stateFixture;
  const mockRawStatResponse = rawStatsFixture;
  const expectedStatsResponse = statsFixture;
  const mockRawProjectionResponse = rawProjectionsFixture;
  const expectedProjectionResponse = projectionsFixture;

  const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => {
    return {
      // @ts-ignore
      config: {},
      data: data,
      headers: {},
      status: 200,
      statusText: 'OK',
    };
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SleeperService, { provide: HttpService, useValue: { get: jest.fn() } }],
    }).compile();

    service = module.get<SleeperService>(SleeperService);
    httpService = module.get(HttpService);
  });

  it('should return NFL state', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockState)));
    const result = await service.getNflState();
    expect(result).toEqual(mockState);
  });

  it('should return player projections with transformed dates and season', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockRawProjectionResponse)));

    const result: SleeperProjectionResponse = await service.getPlayerProjections('WR', 2025, 4);
    expect(
      result.map((e) => ({
        ...e,
        date: e.date.toISOString(),
        last_modified: e.last_modified.toISOString(),
        updated_at: e.updated_at.toISOString(),
      })),
    ).toEqual(expectedProjectionResponse);
  });

  it('should return player stats with defaults and transformed dates', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockRawStatResponse)));

    const result: SleeperStatResponse = await service.getPlayerStatistics('WR', 2025, 4);
    expect(
      result.map((e) => ({
        ...e,
        date: e.date.toISOString(),
        last_modified: e.last_modified.toISOString(),
        updated_at: e.updated_at.toISOString(),
      })),
    ).toEqual(expectedStatsResponse);
  });
});

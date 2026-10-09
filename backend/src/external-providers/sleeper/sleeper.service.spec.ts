import { SportLeague } from '@/common/types/sport-league.type';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import rawNbaProjectionsFixture from './__fixtures__/sleeper-nba-projections.raw.test.json';
import rawNbaScoresFixture from './__fixtures__/sleeper-nba-scores.raw.test.json';
import rawNbaStatsFixture from './__fixtures__/sleeper-nba-stats.raw.test.json';
import rawProjectionsFixture from './__fixtures__/sleeper-projections.raw.test.json';
import projectionsFixture from './__fixtures__/sleeper-projections.transformed.test.json';
import stateFixture from './__fixtures__/sleeper-state.test.json';
import rawStatsFixture from './__fixtures__/sleeper-stats.raw.test.json';
import statsFixture from './__fixtures__/sleeper-stats.transformed.test.json';
import { SleeperProjectionResponse, SleeperStatResponse } from './entities/sleeper.entity';
import { SleeperService } from './sleeper.service';

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
      providers: [
        SleeperService,
        { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
      ],
    }).compile();

    service = module.get<SleeperService>(SleeperService);
    httpService = module.get(HttpService);
  });

  it('should return NFL state', async () => {
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockState)));
    const result = await service.getStateForSport();
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

  it('should return NFL week game dates from the GraphQL scores endpoint', async () => {
    httpService.post.mockReturnValueOnce(
      of(
        mockAxiosResponse({
          data: {
            scores: [
              { date: '2025-09-04', status: 'pre_game' },
              { date: '2025-09-07', status: 'pre_game' },
              { date: '2025-09-08', status: 'pre_game' },
            ],
          },
        }),
      ),
    );

    const result = await service.getNflWeekGameDates(2025, 1, 'regular');

    expect(result).toEqual(['2025-09-04', '2025-09-07', '2025-09-08']);
    expect(httpService.post).toHaveBeenCalledWith('https://sleeper.com/graphql', {
      query: expect.stringContaining('batch_scores'),
    });
  });

  describe('NBA', () => {
    it('should return NBA state pruned to the fields sync uses', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockState)));
      const result = await service.getStateForSport(SportLeague.NBA);
      expect(result).toEqual({
        week: mockState.week,
        season: mockState.season,
        season_type: mockState.season_type,
        display_week: mockState.display_week,
        league_season: mockState.league_season,
        leg: mockState.leg
      });
      expect(httpService.get).toHaveBeenCalledWith('https://api.sleeper.app/v1/state/nba');
    });

    it('should accept an off-season state', async () => {
      httpService.get.mockReturnValueOnce(
        of(mockAxiosResponse({ ...mockState, season_type: 'off', season: '2026', week: 0 })),
      );
      await expect(service.getStateForSport(SportLeague.NBA)).resolves.toEqual({
        week: 0,
        season: '2026',
        season_type: 'off',
        display_week: mockState.display_week,
        league_season: mockState.league_season,
        leg: mockState.leg,
      });
    });

    it.each([
      ['empty body', {}],
      ['non-numeric season', { week: 3, season: 'next', season_type: 'regular' }],
      ['fractional week', { week: 2.5, season: '2026', season_type: 'regular' }],
      ['negative week', { week: -1, season: '2026', season_type: 'regular' }],
      ['missing season type', { week: 3, season: '2026' }],
    ])('should reject a malformed NBA state (%s)', async (_label, body) => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(body)));
      await expect(service.getStateForSport(SportLeague.NBA)).rejects.toThrow();
    });

    it('should return the games for an NBA week, pruned to the fields we use', async () => {
      httpService.post.mockReturnValueOnce(of(mockAxiosResponse(rawNbaScoresFixture)));

      const result = await service.getNbaWeekGames(2025, 10, 'regular');

      expect(result).toEqual([
        {
          game_id: '1261029462443565056',
          date: '2025-12-25',
          status: 'complete',
          start_time: 1766682000000,
          metadata: { home_team: { team: 'NYK' }, away_team: { team: 'CLE' } },
        },
        {
          game_id: '1261029463890599936',
          date: '2025-12-25',
          status: 'complete',
          start_time: 1766691000000,
          metadata: { home_team: { team: 'OKC' }, away_team: { team: 'SAS' } },
        },
      ]);
      const [, body] = httpService.post.mock.calls[0];
      expect((body as { query: string }).query).toContain(
        'scores(sport: "nba", season_type: "regular", season: "2025", week: 10)',
      );
    });

    it('should return per-game projections, dropping rows with no projected stats', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(rawNbaProjectionsFixture)));

      const result = await service.getNbaProjections(2025, 10);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.sleeper.app/projections/nba/2025/10?season_type=regular',
      );
      expect(result.map((e) => [e.player_id, e.date, e.game_id])).toEqual([
        ['2267', '2025-12-22', '1261814776841895936'],
        ['2267', '2025-12-23', '1261814785209532416'],
      ]);
      expect(result[0]).toMatchObject({
        season: 2025,
        team: 'DET',
        player: { first_name: 'Cade', last_name: 'Cunningham', position: 'PG', fantasy_positions: ['PG'] },
      });
      // Pruned to the scoring fields (fga, sp, etc. are dropped)
      expect(result[0].stats).toEqual({
        pts: 27.89, reb: 6.73, ast: 7.92, stl: 1.51, blk: 0.7, to: 4.12, tpm: 2.55, dd: 0.34, td: 0.09,
      });
    });

    it('should return per-game stats, dropping team rows and keeping DNP rows', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(rawNbaStatsFixture)));

      const result = await service.getNbaStatistics(2025, 10);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.sleeper.app/stats/nba/2025/10?season_type=regular',
      );
      expect(result.map((e) => [e.player.last_name, e.date, e.stats.pts_std])).toEqual([
        ['Cunningham', '2025-12-22', 19.5],
        ['Cunningham', '2025-12-23', 35.5],
        ['Curry', '2025-12-22', undefined],
      ]);
      // DNP: Sleeper sends an empty stat line, passed through as-is
      expect(result[2].stats).toEqual({});
      expect(result[0].stats).not.toHaveProperty('pts_std_dfs');
    });

    it.each([
      ['null stats', null],
      ['missing stats', undefined],
    ])('should reject a stat row with %s', async (_label, stats) => {
      const [first] = rawNbaStatsFixture;
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse([{ ...first, stats }])));

      await expect(service.getNbaStatistics(2025, 10)).rejects.toThrow();
    });

    it('should reject an unexpected response shape instead of returning partial data', async () => {
      const [first] = rawNbaStatsFixture;
      httpService.get.mockReturnValueOnce(
        of(mockAxiosResponse([{ ...first, player: { ...first.player, position: 'QB' } }])),
      );

      await expect(service.getNbaStatistics(2025, 10)).rejects.toThrow();
    });
  });
});

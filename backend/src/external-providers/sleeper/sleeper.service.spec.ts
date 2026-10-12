import { SportLeague } from '@/common/types/sport-league.type';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';
import rawNbaProjectionsFixture from './__fixtures__/sleeper-nba-projections.raw.test.json';
import rawNbaScheduleFixture from './__fixtures__/sleeper-nba-schedule.raw.test.json';
import rawNbaStatsFixture from './__fixtures__/sleeper-nba-stats.raw.test.json';
import rawProjectionsFixture from './__fixtures__/sleeper-projections.raw.test.json';
import projectionsFixture from './__fixtures__/sleeper-projections.transformed.test.json';
import stateFixture from './__fixtures__/sleeper-state.test.json';
import rawStatsFixture from './__fixtures__/sleeper-stats.raw.test.json';
import statsFixture from './__fixtures__/sleeper-stats.transformed.test.json';
import { SleeperNflStatResponse } from './entities/sleeper.entity';
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

    const result: SleeperNflStatResponse = await service.getPlayerProjections('WR', 2025, 4);
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

    const result: SleeperNflStatResponse = await service.getPlayerStatistics('WR', 2025, 4);
    expect(
      result.map((e) => ({
        ...e,
        date: e.date.toISOString(),
        last_modified: e.last_modified.toISOString(),
        updated_at: e.updated_at.toISOString(),
      })),
    ).toEqual(expectedStatsResponse);
  });

  it('should return the NFL season schedule, keeping playoff placeholder rows', async () => {
    const schedule = [
      {
        status: 'complete',
        date: '2026-01-10',
        home: 'CAR',
        week: 1,
        game_id: '202530105',
        away: 'LAR',
      },
      {
        status: 'canceled',
        date: '2026-02-08',
        home: 'AFC Championship (win)',
        week: 4,
        game_id: '202530400',
        away: 'NFC Championship (win)',
      },
    ];
    httpService.get.mockReturnValueOnce(of(mockAxiosResponse(schedule)));

    const result = await service.getScheduleForSport(SportLeague.NFL, 2025, 'post');

    expect(httpService.get).toHaveBeenCalledWith('https://api.sleeper.com/schedule/nfl/post/2025');
    expect(result).toEqual(schedule);
  });

  it('should reject an NFL schedule game with a malformed date', async () => {
    httpService.get.mockReturnValueOnce(
      of(
        mockAxiosResponse([
          { status: 'pre_game', date: '', home: 'KC', week: 1, game_id: '202610101', away: 'BUF' },
        ]),
      ),
    );

    await expect(service.getScheduleForSport(SportLeague.NFL, 2026, 'regular')).rejects.toThrow();
  });

  describe('NBA', () => {
    const rawNbaProjection = (stats: Record<string, number>) => ({
      status: null,
      date: '2025-12-22',
      stats,
      category: 'proj',
      last_modified: 1766994004815,
      week: 10,
      sport: 'nba',
      season_type: 'regular',
      season: '2025',
      player: {
        fantasy_positions: ['PG'],
        first_name: 'Cade',
        injury_status: null,
        last_name: 'Cunningham',
        metadata: { channel_id: '1' },
        position: 'PG',
      },
      team: 'DET',
      player_id: '2267',
      opponent: 'POR',
      updated_at: 1766994004815,
      game_id: 'proj-game',
    });

    it('should return NBA state pruned to the fields sync uses', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(mockState)));
      const result = await service.getStateForSport(SportLeague.NBA);
      expect(result).toEqual({
        week: mockState.week,
        season: mockState.season,
        season_type: mockState.season_type,
        display_week: mockState.display_week,
        league_season: mockState.league_season,
        leg: mockState.leg,
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

    it('should return the NBA season schedule, flattening team objects and pruning box-score fields', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(rawNbaScheduleFixture)));

      const result = await service.getScheduleForSport(SportLeague.NBA, 2025, 'regular');

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.sleeper.com/schedule/nba/regular/2025',
      );
      // Box-score fields on completed games (points, starters, ...) are dropped
      expect(result).toEqual([
        {
          game_id: '1261029462443565056',
          date: '2025-12-25',
          week: 10,
          status: 'complete',
          home: 'NYK',
          away: 'CLE',
        },
        {
          game_id: '1261814864452517888',
          date: '2026-01-08',
          week: 12,
          status: 'postponed',
          home: 'CHI',
          away: 'MIA',
        },
      ]);
    });

    it('should flatten NBA schedule home/away team objects to plain strings', async () => {
      // Sleeper sends NBA teams as objects ({ team, record, points, ... }), unlike
      // NFL rows which are already plain strings
      httpService.get.mockReturnValueOnce(
        of(
          mockAxiosResponse([
            {
              status: 'complete',
              date: '2025-12-25',
              week: 10,
              game_id: '1261029462443565056',
              home: { team: 'NYK', record: '53-29', points: 126 },
              away: { team: 'CLE', record: '52-30', points: 124 },
            },
          ]),
        ),
      );

      const result = await service.getScheduleForSport(SportLeague.NBA, 2025, 'regular');

      expect(result[0].home).toBe('NYK');
      expect(result[0].away).toBe('CLE');
      // The team object's extra fields (record, points) are pruned away too
      expect(result[0]).toEqual({
        game_id: '1261029462443565056',
        date: '2025-12-25',
        week: 10,
        status: 'complete',
        home: 'NYK',
        away: 'CLE',
      });
    });

    it('should reject a schedule game without a week', async () => {
      const { week, ...noWeek } = rawNbaScheduleFixture[0];
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse([noWeek])));

      await expect(service.getScheduleForSport(SportLeague.NBA, 2025, 'regular')).rejects.toThrow();
    });

    it('should return per-game projections, dropping rows with no projected stats', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(rawNbaProjectionsFixture)));

      const result = await service.getNbaProjections(2025, 10);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.sleeper.app/projections/nba/2025/10?season_type=regular',
      );
      expect(result.map((e) => [e.player_id, e.date, e.game_id])).toEqual([
        ['2267', new Date('2025-12-22'), '1261814776841895936'],
        ['2267', new Date('2025-12-23'), '1261814785209532416'],
      ]);
      expect(result[0]).toMatchObject({
        season: 2025,
        team: 'DET',
        player: {
          first_name: 'Cade',
          last_name: 'Cunningham',
          position: 'PG',
          fantasy_positions: ['PG'],
        },
      });
      // Pruned to just the scored total (box-score fields, fga, sp, etc. are dropped)
      expect(result[0].stats).toEqual({
        pts_std: 30.69,
      });
    });

    it('should return per-game stats, dropping team rows and keeping DNP rows', async () => {
      httpService.get.mockReturnValueOnce(of(mockAxiosResponse(rawNbaStatsFixture)));

      const result = await service.getNbaStatistics(2025, 10);

      expect(httpService.get).toHaveBeenCalledWith(
        'https://api.sleeper.app/stats/nba/2025/10?season_type=regular',
      );
      expect(result.map((e) => [e.player.last_name, e.date, e.stats.pts_std])).toEqual([
        ['Cunningham', new Date('2025-12-22'), 19.5],
        ['Cunningham', new Date('2025-12-23'), 35.5],
        ['Curry', new Date('2025-12-22'), 0],
      ]);
      // DNP: Sleeper sends an empty stat line with no pts_std; defaulted to 0
      expect(result[2].stats).toEqual({ pts_std: 0 });
      expect(result[0].stats).not.toHaveProperty('pts_std_dfs');
    });

    it.each([
      ['Cade Cunningham 2025-12-22', { pts: 14, reb: 6, ast: 9, stl: 1, to: 5, tpm: 1 }, 19.5],
      [
        'Cade Cunningham 2025-12-23 (double-double)',
        { pts: 23, reb: 7, ast: 14, stl: 5, to: 9, tpm: 2, dd: 1 },
        35.5,
      ],
      [
        '56-point triple-double with every bonus',
        {
          pts: 56,
          reb: 16,
          ast: 15,
          blk: 2,
          to: 5,
          tpm: 4,
          dd: 1,
          td: 1,
          bonus_pt_40p: 1,
          bonus_pt_50p: 1,
        },
        67,
      ],
    ])(
      'scores a projected stat line with the pts_std weights (%s)',
      async (_label, stats, expected) => {
        httpService.get.mockReturnValueOnce(of(mockAxiosResponse([rawNbaProjection(stats)])));

        const result = await service.getNbaProjections(2025, 10);

        expect(result[0].stats.pts_std).toBe(expected);
      },
    );

    it('ignores rebound/assist bonus fields, which are worth 0 in pts_std', async () => {
      httpService.get.mockReturnValueOnce(
        of(
          mockAxiosResponse([
            rawNbaProjection({
              pts: 22,
              reb: 1,
              ast: 15,
              stl: 2,
              to: 1,
              tpm: 1,
              dd: 1,
              bonus_ast_15p: 1,
            }),
          ]),
        ),
      );

      const result = await service.getNbaProjections(2025, 10);

      expect(result[0].stats.pts_std).toBe(31.5);
    });

    it('uses dd/td probabilities as expected value on projections, rounded to 2dp', async () => {
      httpService.get.mockReturnValueOnce(
        of(
          mockAxiosResponse([
            rawNbaProjection({
              pts: 17.53,
              reb: 5.28,
              ast: 5.94,
              stl: 0.8,
              blk: 0.41,
              to: 2.69,
              tpm: 1.43,
              dd: 0.16,
              td: 0.03,
            }),
          ]),
        ),
      );

      const result = await service.getNbaProjections(2025, 10);

      expect(result[0].stats.pts_std).toBe(20.65);
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
        of(mockAxiosResponse([{ ...first, player: { ...first.player, position: '1B' } }])),
      );

      await expect(service.getNbaStatistics(2025, 10)).rejects.toThrow();
    });
  });
});

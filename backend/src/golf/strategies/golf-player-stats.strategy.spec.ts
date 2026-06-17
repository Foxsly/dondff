import { Test, TestingModule } from '@nestjs/testing';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { GolfPlayerStatsStrategy } from './golf-player-stats.strategy';
import { EventGroup } from '@/events/entities/event-group.entity';
import { SportLeague } from '@/common/types/sport-league.type';

// Golf splits data sources: FanDuel provides pre-tournament projections,
// ESPN provides live tournament leaderboard (real-time stats). This differs
// from NFL where projections and stats can come from the same provider.
describe('GolfPlayerStatsStrategy', () => {
  let strategy: GolfPlayerStatsStrategy;
  let fanduelService: jest.Mocked<FanduelService>;
  let espnService: jest.Mocked<EspnService>;

  const mockEventGroup: EventGroup = {
    eventGroupId: 'eg-1',
    name: 'The Masters',
    sportLeague: SportLeague.GOLF,
  };

  beforeEach(async () => {
    fanduelService = {
      getGolfProjections: jest.fn(),
    } as any;
    espnService = {
      getTournamentLeaderboard: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GolfPlayerStatsStrategy,
        { provide: FanduelService, useValue: fanduelService },
        { provide: EspnService, useValue: espnService },
      ],
    }).compile();

    strategy = module.get(GolfPlayerStatsStrategy);
  });

  describe('getProjections', () => {
    it('maps FanDuel golf projections to IPlayerProjection', async () => {
      fanduelService.getGolfProjections.mockResolvedValue([
        {
          fantasy: 95.5,
          salary: '10000',
          player: { numberFireId: 123, name: 'Scottie Scheffler', imageUrl: null },
        },
        {
          fantasy: 88.2,
          salary: '9500',
          player: { numberFireId: 456, name: 'Rory McIlroy', imageUrl: null },
        },
      ]);

      const result = await strategy.getProjections(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        playerId: '123',
        name: 'Scottie Scheffler',
        position: 'GOLF_PLAYER',
        projectedPoints: 95.5,
        injuryStatus: null,
        team: '',
      });
      expect(result[1]).toEqual({
        playerId: '456',
        name: 'Rory McIlroy',
        position: 'GOLF_PLAYER',
        projectedPoints: 88.2,
        injuryStatus: null,
        team: '',
      });
    });

    it('stringifies numberFireId to playerId', async () => {
      // FanDuel uses numberFire IDs for golfers (numeric), but the rest of
      // the system uses string-based playerId. Converting via toString()
      // keeps the type consistent across all sports.
      fanduelService.getGolfProjections.mockResolvedValue([
        { fantasy: 50, salary: '10000', player: { numberFireId: 789, name: 'Test', imageUrl: null } },
      ]);

      const result = await strategy.getProjections(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(result[0].playerId).toBe('789');
    });

    it('ignores season, eventGroup, events, and position params', async () => {
      // Golf projections are tournament-agnostic: FanDuel returns all active
      // PGA golfers regardless of which tournament is being drafted. The
      // season, event group, events list, and position are unused.
      fanduelService.getGolfProjections.mockResolvedValue([
        { fantasy: 50, salary: '10000', player: { numberFireId: 1, name: 'A', imageUrl: null } },
      ]);

      const result = await strategy.getProjections(999, mockEventGroup, [], 'ANY_POSITION');

      expect(result).toHaveLength(1);
    });
  });

  describe('getStatistics', () => {
    it('maps ESPN leaderboard competitors to IPlayerStats', async () => {
      // Live scoring comes from ESPN's tournament leaderboard, not FanDuel.
      // Hole-by-hole scores are accumulated via golfScoringUtil.
      espnService.getTournamentLeaderboard.mockResolvedValue({
        tournamentName: 'The Masters',
        competitors: [
          {
            athleteName: 'Scottie Scheffler',
            position: 1,
            rounds: [
              {
                roundNumber: 1,
                holes: [
                  { holeNumber: 1, scoreType: '-1' },
                  { holeNumber: 2, scoreType: 'E' },
                ],
              },
            ],
          },
        ],
      });

      const result = await strategy.getStatistics(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(result).toHaveLength(1);
      expect(result[0].playerId).toBe('Scottie Scheffler');
      expect(result[0].name).toBe('Scottie Scheffler');
      expect(result[0].position).toBe('GOLF_PLAYER');
      expect(result[0].points).toBeGreaterThan(0);
      expect(result[0].team).toBe('');
    });

    it('returns empty array when leaderboard is null', async () => {
      // Tournament hasn't started or ESPN API failure — return no stats
      // rather than throwing.
      espnService.getTournamentLeaderboard.mockResolvedValue(null);

      const result = await strategy.getStatistics(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(result).toEqual([]);
    });

    it('passes season and eventGroup name to ESPN service', async () => {
      // ESPN's leaderboard endpoint requires year + tournament name.
      // The event group name was already matched during sync, so it's
      // passed directly rather than re-deriving the tournament name.
      espnService.getTournamentLeaderboard.mockResolvedValue({
        tournamentName: 'The Masters',
        competitors: [],
      });

      await strategy.getStatistics(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(espnService.getTournamentLeaderboard).toHaveBeenCalledWith(2025, 'The Masters');
    });

    it('handles multiple competitors with different positions', async () => {
      espnService.getTournamentLeaderboard.mockResolvedValue({
        tournamentName: 'The Masters',
        competitors: [
          {
            athleteName: 'Player A',
            position: 1,
            rounds: [{ roundNumber: 1, holes: [{ holeNumber: 1, scoreType: 'E' }] }],
          },
          {
            athleteName: 'Player B',
            position: 2,
            rounds: [{ roundNumber: 1, holes: [{ holeNumber: 1, scoreType: '-1' }] }],
          },
        ],
      });

      const result = await strategy.getStatistics(2025, mockEventGroup, [], 'GOLF_PLAYER');

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.name)).toEqual(['Player A', 'Player B']);
    });
  });
});

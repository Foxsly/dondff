import { Test, TestingModule } from '@nestjs/testing';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { NflEventSyncStrategy } from './nfl-event-sync.strategy';

const game = (week: number, date: string, status = 'pre_game') => ({
  game_id: `${week}-${date}-${status}`,
  date,
  week,
  status,
  home: 'KC',
  away: 'BUF',
});

describe('NflEventSyncStrategy', () => {
  let strategy: NflEventSyncStrategy;
  let sleeperService: jest.Mocked<SleeperService>;

  beforeEach(async () => {
    sleeperService = {
      getStateForSport: jest.fn(),
      getNflSchedule: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NflEventSyncStrategy,
        { provide: SleeperService, useValue: sleeperService },
      ],
    }).compile();

    strategy = module.get(NflEventSyncStrategy);
  });

  describe('fetchSyncData', () => {
    it('builds a group with min/max game dates as start/end', async () => {
      sleeperService.getStateForSport.mockResolvedValue({
        week: 1,
        season: '2025',
        season_type: 'regular',
      } as any);
      sleeperService.getNflSchedule.mockResolvedValue([
        game(1, '2025-09-08'),
        game(1, '2025-09-04'),
        game(1, '2025-09-07'),
        game(2, '2025-09-11'),
      ]);

      const result = await strategy.fetchSyncData();

      expect(sleeperService.getNflSchedule).toHaveBeenCalledWith(2025, 'regular');
      expect(result).toEqual([
        {
          name: 'NFL Week 1',
          seasonYear: 2025,
          events: [
            {
              externalId: '2025-1',
              externalSource: 'SLEEPER',
              name: 'NFL Week 1',
              startDate: '2025-09-04',
              endDate: '2025-09-08',
            },
          ],
        },
      ]);
    });

    it('maps post-season display weeks back to Sleeper weeks', async () => {
      sleeperService.getStateForSport.mockResolvedValue({
        week: 19,
        season: '2025',
        season_type: 'post',
      } as any);
      sleeperService.getNflSchedule.mockResolvedValue([
        game(1, '2026-01-10'),
        game(1, '2026-01-11'),
        game(2, '2026-01-17'),
      ]);

      const result = await strategy.fetchSyncData();

      expect(sleeperService.getNflSchedule).toHaveBeenCalledWith(2025, 'post');
      expect(result![0].name).toBe('NFL Week 19');
      expect(result![0].events[0].startDate).toBe('2026-01-10');
      expect(result![0].events[0].endDate).toBe('2026-01-11');
    });

    it('returns an empty array when the week has no game dates', async () => {
      sleeperService.getStateForSport.mockResolvedValue({
        week: 1,
        season: '2025',
        season_type: 'regular',
      } as any);
      sleeperService.getNflSchedule.mockResolvedValue([game(2, '2025-09-11')]);

      const result = await strategy.fetchSyncData();

      expect(result).toEqual([]);
    });

    it('ignores canceled games when finding the week dates', async () => {
      sleeperService.getStateForSport.mockResolvedValue({
        week: 19,
        season: '2025',
        season_type: 'post',
      } as any);
      sleeperService.getNflSchedule.mockResolvedValue([
        game(1, '2026-01-10', 'complete'),
        game(1, '2026-01-11', 'complete'),
        game(1, '2026-01-12', 'canceled'),
      ]);

      const result = await strategy.fetchSyncData();

      expect(result[0].events[0].endDate).toBe('2026-01-11');
    });

    it('returns an empty array when every game in the week is canceled', async () => {
      sleeperService.getStateForSport.mockResolvedValue({
        week: 1,
        season: '2025',
        season_type: 'regular',
      } as any);
      sleeperService.getNflSchedule.mockResolvedValue([game(1, '2025-09-04', 'canceled')]);

      expect(await strategy.fetchSyncData()).toEqual([]);
    });
  });
});
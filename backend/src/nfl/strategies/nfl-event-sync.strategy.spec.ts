import { Test, TestingModule } from '@nestjs/testing';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { NflEventSyncStrategy } from './nfl-event-sync.strategy';

describe('NflEventSyncStrategy', () => {
  let strategy: NflEventSyncStrategy;
  let sleeperService: jest.Mocked<SleeperService>;

  beforeEach(async () => {
    sleeperService = {
      getNflState: jest.fn(),
      getNflWeekGameDates: jest.fn(),
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
      sleeperService.getNflState.mockResolvedValue({
        week: 1,
        season: '2025',
        season_type: 'regular',
      } as any);
      sleeperService.getNflWeekGameDates.mockResolvedValue([
        '2025-09-08',
        '2025-09-04',
        '2025-09-07',
      ]);

      const result = await strategy.fetchSyncData();

      expect(sleeperService.getNflWeekGameDates).toHaveBeenCalledWith(2025, 1, 'regular');
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
      sleeperService.getNflState.mockResolvedValue({
        week: 19,
        season: '2025',
        season_type: 'post',
      } as any);
      sleeperService.getNflWeekGameDates.mockResolvedValue(['2026-01-10', '2026-01-11']);

      const result = await strategy.fetchSyncData();

      expect(sleeperService.getNflWeekGameDates).toHaveBeenCalledWith(2025, 1, 'post');
      expect(result![0].name).toBe('NFL Week 19');
      expect(result![0].events[0].startDate).toBe('2026-01-10');
      expect(result![0].events[0].endDate).toBe('2026-01-11');
    });

    it('returns an empty array when the week has no game dates', async () => {
      sleeperService.getNflState.mockResolvedValue({
        week: 1,
        season: '2025',
        season_type: 'regular',
      } as any);
      sleeperService.getNflWeekGameDates.mockResolvedValue([]);

      const result = await strategy.fetchSyncData();

      expect(result).toEqual([]);
    });
  });
});
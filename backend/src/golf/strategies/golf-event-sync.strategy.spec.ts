import { Test, TestingModule } from '@nestjs/testing';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { GolfEventSyncStrategy } from './golf-event-sync.strategy';

describe('GolfEventSyncStrategy', () => {
  let strategy: GolfEventSyncStrategy;
  let fanduelService: jest.Mocked<FanduelService>;
  let espnService: jest.Mocked<EspnService>;

  beforeEach(async () => {
    fanduelService = {
      getGolfEvents: jest.fn(),
    } as any;
    espnService = {
      getPgaSchedule: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GolfEventSyncStrategy,
        { provide: FanduelService, useValue: fanduelService },
        { provide: EspnService, useValue: espnService },
      ],
    }).compile();

    strategy = module.get(GolfEventSyncStrategy);
  });

  describe('fetchSyncData', () => {
    it('returns matched groups when ESPN schedule contains matching events', async () => {
      // Events must exist in both FanDuel (has projections) and ESPN (has
      // schedule/leaderboard). The match is by name with normalisation.
      fanduelService.getGolfEvents.mockResolvedValue([
        { id: 'event-1', name: 'Genesis Scottish Open' },
      ]);
      espnService.getPgaSchedule.mockResolvedValue([
        { name: 'Genesis Scottish Open', startDate: '2025-07-10', endDate: '2025-07-13', state: 'pre' },
      ]);

      const result = await strategy.fetchSyncData();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'Genesis Scottish Open',
        events: [
          {
            externalId: 'event-1',
            externalSource: 'FANDUEL',
            name: 'Genesis Scottish Open',
            startDate: '2025-07-10',
            endDate: '2025-07-13',
          },
        ],
      });
    });

    it('filters out FanDuel events that have no ESPN match', async () => {
      // A FanDuel-only event (no ESPN schedule) cannot be synced because
      // there's no leaderboard data for live scoring. It gets dropped.
      fanduelService.getGolfEvents.mockResolvedValue([
        { id: 'event-1', name: 'Mystery Tournament' },
      ]);
      espnService.getPgaSchedule.mockResolvedValue([
        { name: 'Genesis Scottish Open', startDate: '2025-07-10', endDate: '2025-07-13', state: 'pre' },
      ]);

      const result = await strategy.fetchSyncData();

      expect(result).toEqual([]);
    });

    it('matches despite minor name differences via normalizeEventName', async () => {
      // normaliseEventName strips "The ", trailing punctuation, sponsor names
      // in parentheses, and year suffixes so "The Masters Tournament" matches
      // "the masters tournament!".
      fanduelService.getGolfEvents.mockResolvedValue([
        { id: 'event-2', name: 'The Masters Tournament' },
      ]);
      espnService.getPgaSchedule.mockResolvedValue([
        { name: 'the masters tournament!', startDate: '2025-04-10', endDate: '2025-04-13', state: 'pre' },
      ]);

      const result = await strategy.fetchSyncData();

      expect(result).toHaveLength(1);
      expect(result[0].events[0].externalId).toBe('event-2');
    });

    it('returns multiple groups when multiple FanDuel events have ESPN matches', async () => {
      fanduelService.getGolfEvents.mockResolvedValue([
        { id: 'e1', name: 'Event One' },
        { id: 'e2', name: 'Event Two' },
        { id: 'e3', name: 'No Match Event' },
      ]);
      espnService.getPgaSchedule.mockResolvedValue([
        { name: 'Event One', startDate: '2025-01-01', endDate: '2025-01-04', state: 'pre' },
        { name: 'Event Two', startDate: '2025-02-01', endDate: '2025-02-04', state: 'pre' },
      ]);

      const result = await strategy.fetchSyncData();

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.name)).toEqual(['Event One', 'Event Two']);
    });
  });
});

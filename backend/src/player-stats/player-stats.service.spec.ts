import { Test, TestingModule } from '@nestjs/testing';
import { PlayerStatsService } from './player-stats.service';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import { EspnService } from '@/external-providers/espn/espn.service';
import { EventsService } from '@/events/events.service';
import { FifaService } from '@/external-providers/fifa/fifa.service';

// ---------------------------------------------------------------------------
// FIXTURES
// ---------------------------------------------------------------------------
// These simulate the data returned by FifaService.getRoundProjections().
// We use the same shape as IFifaPlayerRoundProjection from the FIFA module.
// Two DEF players so we can test filtering by position.
const mockFifaProjections = [
  {
    id: 1,
    firstName: 'Jordan',
    lastName: 'Bos',
    knownName: null,
    position: 'DEF',
    price: 4.0,
    status: 'playing',
    fantasyPoints: 0,
    team: 'Korea Republic',
    opponent: 'Czechia',
    matchDate: '2026-06-12T03:00:00+01:00',
    group: 'a',
  },
  {
    id: 2,
    firstName: 'Kye',
    lastName: 'Rowles',
    knownName: null,
    position: 'DEF',
    price: 3.9,
    status: 'playing',
    fantasyPoints: 0,
    team: 'Korea Republic',
    opponent: 'Czechia',
    matchDate: '2026-06-12T03:00:00+01:00',
    group: 'a',
  },
];

describe('PlayerStatsService', () => {
  let service: PlayerStatsService;
  let eventsService: jest.Mocked<EventsService>;
  let fifaService: jest.Mocked<FifaService>;

  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------
  // We use the standard NestJS testing module pattern. Every dependency is
  // replaced with a mock (jest.fn()) so we control exactly what they return.
  //
  // Services injected by PlayerStatsService:
  //   - SleeperService — not used by WORLDCUP branch, empty mock
  //   - FanduelService — not used by WORLDCUP branch, empty mock
  //   - EspnService — not used by WORLDCUP branch, empty mock
  //   - EventsService — needed for findEventsByEventGroup (to resolve round ID)
  //   - FifaService — needed for getRoundProjections (to fetch player data)
  //
  // jest.clearAllMocks() in beforeEach prevents test pollution — without it,
  // call-count assertions like toHaveBeenCalledTimes would be wrong.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlayerStatsService,
        { provide: SleeperService, useValue: {} },
        { provide: FanduelService, useValue: {} },
        { provide: EspnService, useValue: {} },
        {
          provide: EventsService,
          useValue: {
            findEventsByEventGroup: jest.fn(),
          },
        },
        {
          provide: FifaService,
          useValue: {
            getRoundProjections: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PlayerStatsService>(PlayerStatsService);
    eventsService = module.get(EventsService);
    fifaService = module.get(FifaService);
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP: getPlayerProjections — WORLDCUP branch
  // ---------------------------------------------------------------------------

  describe('getPlayerProjections with WORLDCUP', () => {
    // --- TEST 1: Happy path — projections returned with price as projectedPoints ---
    //
    // This is the core test: when the sportLeague is WORLDCUP, the service
    // should:
    //   1. Find events for the event group to determine which FIFA round
    //   2. Call FifaService.getRoundProjections with the correct round ID
    //   3. Filter by position
    //   4. Map to IPlayerProjection with projectedPoints = price
    //
    // We verify both the transformation correctness AND the delegation chain
    // (right methods called, right arguments).
    it('should return projections with price as projectedPoints', async () => {
      // ARRANGE
      // Event has an externalEventId in the format "WC-{roundId}-{matchId}".
      // Our code parses round 1 from "WC-1-58".
      eventsService.findEventsByEventGroup.mockResolvedValue([
        {
          eventId: 'evt-1',
          eventGroupId: 'group-1',
          name: 'Korea Republic vs Czechia',
          startDate: '2026-06-12T03:00:00+01:00',
          endDate: '2026-06-12T03:00:00+01:00',
          externalEventId: 'WC-1-58',
          externalEventSource: 'FIFA',
        },
      ] as any);

      fifaService.getRoundProjections.mockResolvedValue(mockFifaProjections as any);

      // ACT
      const result = await service.getPlayerProjections(
        'DEF',
        2026,
        'group-1',
        'WORLDCUP',
      );

      // ASSERT
      // 1. It resolved the round ID from the event's externalEventId
      expect(eventsService.findEventsByEventGroup).toHaveBeenCalledWith('group-1');

      // 2. It fetched projections for the correct round
      expect(fifaService.getRoundProjections).toHaveBeenCalledWith(1);

      // 3. Both DEF players from the fixture are returned
      expect(result).toHaveLength(2);

      // 4. projectedPoints comes from price (4.0 and 3.9), NOT from fantasyPoints
      expect(result[0]).toEqual({
        playerId: '1',
        name: 'Jordan Bos',
        position: 'DEF',
        projectedPoints: 4.0,
        injuryStatus: 'playing',
        oppTeam: 'Czechia',
        team: 'Korea Republic',
      });
      expect(result[1]).toEqual({
        playerId: '2',
        name: 'Kye Rowles',
        position: 'DEF',
        projectedPoints: 3.9,
        injuryStatus: 'playing',
        oppTeam: 'Czechia',
        team: 'Korea Republic',
      });
    });

    // --- TEST 2: Position filtering ---
    //
    // Ensures that only players matching the requested position are returned.
    // If the service returns ALL positions regardless, that's a bug.
    it('should filter projections by position', async () => {
      eventsService.findEventsByEventGroup.mockResolvedValue([
        { externalEventId: 'WC-1-58' },
      ] as any);

      // Add a MID and GK player to the fixture to test filtering
      const mixedProjections = [
        ...mockFifaProjections,
        {
          id: 3,
          firstName: 'Lamine',
          lastName: 'Yamal',
          knownName: null,
          position: 'MID',
          price: 10.0,
          status: 'playing',
          fantasyPoints: 25,
          team: 'Spain',
          opponent: 'Morocco',
          matchDate: '2026-06-15T20:00:00+01:00',
          group: 'b',
        },
        {
          id: 4,
          firstName: 'Unai',
          lastName: 'Simon',
          knownName: null,
          position: 'GK',
          price: 5.0,
          status: 'playing',
          fantasyPoints: 10,
          team: 'Spain',
          opponent: 'Morocco',
          matchDate: '2026-06-15T20:00:00+01:00',
          group: 'b',
        },
      ];

      fifaService.getRoundProjections.mockResolvedValue(mixedProjections as any);

      // Request MID only
      const result = await service.getPlayerProjections(
        'MID',
        2026,
        'group-1',
        'WORLDCUP',
      );

      expect(result).toHaveLength(1);
      expect(result[0].playerId).toBe('3');
      expect(result[0].position).toBe('MID');
      expect(result[0].projectedPoints).toBe(10.0);
    });

    // --- TEST 3: Transferred players are excluded ---
    //
    // FIFA marks players who have been transferred away from a squad with
    // status 'transferred'. These players should not appear in the draft
    // pool because they are no longer with the team. The filter runs before
    // the position filter, so transferred players of any position are hidden.
    it('should exclude transferred players', async () => {
      eventsService.findEventsByEventGroup.mockResolvedValue([
        { externalEventId: 'WC-1-58' },
      ] as any);

      const projectionsWithTransferred = [
        ...mockFifaProjections,
        {
          id: 99,
          firstName: 'Transferred',
          lastName: 'Player',
          knownName: null,
          position: 'MID',
          price: 5.0,
          status: 'transferred',
          fantasyPoints: 0,
          team: 'Some Team',
          opponent: 'Other Team',
          matchDate: '2026-06-12T03:00:00+01:00',
          group: 'c',
        },
      ];

      fifaService.getRoundProjections.mockResolvedValue(projectionsWithTransferred as any);

      // Request MID — the only MID in the data is transferred, should get 0
      const resultMid = await service.getPlayerProjections(
        'MID',
        2026,
        'group-1',
        'WORLDCUP',
      );
      expect(resultMid).toEqual([]);

      // Request DEF — both DEF players are playing, should get 2
      const resultDef = await service.getPlayerProjections(
        'DEF',
        2026,
        'group-1',
        'WORLDCUP',
      );
      expect(resultDef).toHaveLength(2);
    });

    // --- TEST 4: Empty projections for unknown position ---
    //
    // If the position doesn't match any players, we should get an empty array,
    // not an error. This is important for the frontend — it means "no players
    // available at this position" vs "something broke."
    it('should return empty array when no players match the position', async () => {
      eventsService.findEventsByEventGroup.mockResolvedValue([
        { externalEventId: 'WC-1-58' },
      ] as any);

      fifaService.getRoundProjections.mockResolvedValue(mockFifaProjections as any);

      const result = await service.getPlayerProjections(
        'GK', // No GK in the fixture
        2026,
        'group-1',
        'WORLDCUP',
      );

      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP: getPlayerStatistics — WORLDCUP branch
  // ---------------------------------------------------------------------------

  describe('getPlayerStatistics with WORLDCUP', () => {
    // --- TEST 5: Stats use fantasyPoints as points ---
    //
    // The stats endpoint uses the same FIFA data source (getRoundProjections)
    // but maps fantasyPoints to the `points` field instead of price.
    // This is the actual fantasy score the player accumulated.
    //
    // Why separate projections from stats?
    // - Projections (price) = the case value in Deal or No Deal
    // - Stats (fantasyPoints) = the actual score used for leaderboard/scoring
    // They may diverge in the future when roundPoints replaces totalPoints.
    it('should return stats with fantasyPoints as points', async () => {
      eventsService.findEventsByEventGroup.mockResolvedValue([
        { externalEventId: 'WC-1-58' },
      ] as any);

      fifaService.getRoundProjections.mockResolvedValue([
        {
          ...mockFifaProjections[0],
          // Override fantasyPoints to a non-zero value so we can distinguish
          // it from price (4.0) in the assertion
          fantasyPoints: 7.5,
        },
      ] as any);

      const result = await service.getPlayerStatistics(
        'DEF',
        2026,
        'group-1',
        'WORLDCUP',
      );

      expect(result).toHaveLength(1);
      expect(result[0].playerId).toBe('1');
      expect(result[0].position).toBe('DEF');
      // points comes from fantasyPoints (7.5), NOT from price (4.0)
      expect(result[0].points).toBe(7.5);
      expect(result[0].team).toBe('Korea Republic');
      expect(result[0].oppTeam).toBe('Czechia');
    });
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP: Error handling
  // ---------------------------------------------------------------------------

  describe('error handling', () => {
    // --- TEST 6: No events found throws error ---
    //
    // If the event group has no events yet (e.g., it was created but the sync
    // hasn't populated events), findEventsByEventGroup returns [].
    // We throw an Error rather than returning empty projections because this
    // is a configuration/integration problem — the admin needs to sync events.
    it('should throw when no events exist for the event group', async () => {
      eventsService.findEventsByEventGroup.mockResolvedValue([]);

      // Both projections and stats should throw the same error
      await expect(
        service.getPlayerProjections('DEF', 2026, 'empty-group', 'WORLDCUP'),
      ).rejects.toThrow('No events found for event group empty-group');

      await expect(
        service.getPlayerStatistics('DEF', 2026, 'empty-group', 'WORLDCUP'),
      ).rejects.toThrow('No events found for event group empty-group');
    });

    // --- TEST 7: Malformed externalEventId throws error ---
    //
    // If the externalEventId doesn't match the "WC-{roundId}-{matchId}" format
    // (e.g., manual data entry error, a different external source), we throw
    // a clear error so it's obvious what went wrong.
    it('should throw when externalEventId is malformed', async () => {
      // The "NFL-1-58" prefix doesn't match the "WC-{id}-{id}" pattern
      eventsService.findEventsByEventGroup.mockResolvedValue([
        { externalEventId: 'NFL-1-58' },
      ] as any);

      await expect(
        service.getPlayerProjections('DEF', 2026, 'group-1', 'WORLDCUP'),
      ).rejects.toThrow(
        'Cannot parse round ID from externalEventId: NFL-1-58',
      );
    });
  });
});

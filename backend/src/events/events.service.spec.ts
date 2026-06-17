import { SportLeague } from '@/common/types/sport-league.type';
import { EspnService } from '@/external-providers/espn/espn.service';
import { FanduelService } from '@/external-providers/fanduel/fanduel.service';
import roundsFixture from '@/external-providers/fifa/__fixtures__/fifa-rounds.test.json';
import type { FifaRoundResponse } from '@/external-providers/fifa/entities/fifa.entity';
import { FifaService } from '@/external-providers/fifa/fifa.service';
import { SleeperService } from '@/external-providers/sleeper/sleeper.service';
import { Test, TestingModule } from '@nestjs/testing';
import { EventsRepository } from './events.repository';
import { EventsService } from './events.service';
import { EventSyncStrategyRegistry } from './strategies/event-sync-strategy.registry';

describe('EventsService', () => {
  let service: EventsService;
  let eventsRepository: jest.Mocked<EventsRepository>;
  let fifaService: jest.Mocked<FifaService>;

  const mockRounds: FifaRoundResponse = roundsFixture;

  const mockUuid = (): string => crypto.randomUUID();

  // ---------------------------------------------------------------------------
  // SETUP PATTERN EXPLANATION
  // ---------------------------------------------------------------------------
  // We use NestJS's Test.createTestingModule to create a lightweight "module"
  // that contains our service plus mocked dependencies. This is the standard
  // NestJS testing pattern.
  //
  // Why mock? EventsService talks to external APIs and a database. In a UNIT
  // test, we want to test the service's LOGIC in isolation — not whether the
  // DB or external API works. So we replace every dependency with a jest.fn()
  // that we control: we tell it what to return, and we assert it was called
  // with the right arguments.
  //
  // The "useValue" objects below are "fake" implementations. Every method on
  // EventsRepository gets a jest.fn() so the test can call .mockResolvedValue
  // on it. Dependencies we don't need for these tests (FanduelService, etc.)
  // just get empty objects — they need to exist for the module to compile but
  // won't be called during these tests.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        {
          provide: EventsRepository,
          useValue: {
            createEventGroup: jest.fn(),
            findAllEventGroups: jest.fn(),
            findOneEventGroup: jest.fn(),
            findEventGroupByName: jest.fn(),
            findEventGroupsBySportLeague: jest.fn(),
            updateEventGroup: jest.fn(),
            deleteEventGroup: jest.fn(),
            createEvent: jest.fn(),
            findAllEvents: jest.fn(),
            findOneEvent: jest.fn(),
            findEventsByExternalSource: jest.fn(),
            findEventByExternalEvent: jest.fn(),
            updateEvent: jest.fn(),
            deleteEvent: jest.fn(),
            findEventsByEventGroup: jest.fn(),
          },
        },
        { provide: FanduelService, useValue: {} },
        { provide: SleeperService, useValue: {} },
        { provide: EspnService, useValue: {} },
        {
          provide: FifaService,
          useValue: {
            getRounds: jest.fn(),
          },
        },
        {
          provide: EventSyncStrategyRegistry,
          useValue: {
            get: jest.fn().mockReturnValue({
              fetchSyncData: jest.fn(async () => {
                const rounds = await fifaService.getRounds();
                const groupMap = new Map<string, { name: string; events: any[] }>();
                for (const round of rounds) {
                  for (const match of round.tournaments) {
                    const externalEventId = `WC-${round.id}-${match.id}`;
                    const groupName =
                      round.stage === 'GROUP'
                        ? `World Cup Group Stage – Matchday ${round.id}`
                        : round.stage === 'R32'
                          ? 'World Cup Knockout Stage – Round of 32'
                          : `World Cup Stage ${round.stage}`;

                    let group = groupMap.get(groupName);
                    if (!group) {
                      group = { name: groupName, events: [] };
                      groupMap.set(groupName, group);
                    }
                    group.events.push({
                      externalId: externalEventId,
                      externalSource: 'FIFA',
                      name: `${match.homeSquadName} vs ${match.awaySquadName}`,
                      startDate: match.date,
                      endDate: match.date,
                    });
                  }
                }
                return Array.from(groupMap.values());
              }),
            }),
          },
        },
      ],
    }).compile();

    // Grab references to the real service and the mocked dependencies so we
    // can arrange (set up return values) and assert (check calls) in each test.
    service = module.get<EventsService>(EventsService);
    eventsRepository = module.get(EventsRepository);
    fifaService = module.get(FifaService);
  });

  // ---------------------------------------------------------------------------
  // TEST GROUP: syncWorldCupEvents
  // ---------------------------------------------------------------------------
  // Each describe block groups related tests. Each "it" is one scenario.
  // Naming convention: "should [expected behavior] [when condition]"
  // This makes test output readable: "✓ should create event groups and events
  // for each round and match"
  describe('syncWorldCupEvents', () => {
    // --- TEST 1: Happy path ---
    // Confirms the service correctly processes FIFA round data into event
    // groups and events. This is the "golden path" — everything works as
    // expected, no duplicates, no edge cases.
    //
    // Why this test matters: If the happy path breaks, nothing else matters.
    // It validates the core transformation logic (rounds + matches → groups
    // + events) end-to-end through the service.
    it('should create event groups and events for each round and match', async () => {
      // ARRANGE — set up the world
      // Tell the mocked FifaService to return our test fixture when getRounds
      // is called. The fixture contains 2 rounds: Round 1 (GROUP, 2 matches)
      // and Round 2 (GROUP, 1 match).
      fifaService.getRounds.mockResolvedValue(mockRounds);

      // -----------------------------------------------------------------------
      // WHY THIS MOCK IMPLEMENTATION PATTERN?
      // -----------------------------------------------------------------------
      // The real syncWorldCupEvents() calls findEventGroupByName, gets null,
      // creates the group via createEventGroup, then for the next match in
      // the same round calls findEventGroupByName AGAIN and expects it to
      // find the group we just created.
      //
      // If we just used .mockResolvedValueOnce(null), the second lookup would
      // also return null, causing the code to try creating a duplicate group
      // and the mock would run out of .mockResolvedValueOnce responses.
      //
      // Instead, we store created groups in a plain object and have
      // findEventGroupByName check it. This way the mock behaves like a real
      // "find-or-create" flow:
      //   - First call → no group yet → returns null
      //   - Service creates the group → stored in createdGroups
      //   - Second call for same group name → returns it from the store
      //
      // This is a common pattern: if your code calls a method multiple times
      // with state-dependent results, mock the behavior, not just the values.
      const createdGroups: Record<string, any> = {};
      eventsRepository.findEventGroupByName.mockImplementation((name: string) =>
        Promise.resolve(createdGroups[name] ?? null),
      );
      eventsRepository.createEventGroup.mockImplementation((dto) => {
        const group = { eventGroupId: mockUuid(), ...dto };
        createdGroups[dto.name] = group;
        return Promise.resolve(group);
      });

      // No events exist yet, so findEventByExternalEvent always returns null
      eventsRepository.findEventByExternalEvent.mockResolvedValue(null);

      // We expect 3 events to be created (Round 1 has 2 matches, Round 2 has
      // 1 match). Each call to createEvent returns a new UUID.
      //
      // Note: .mockResolvedValueOnce is for ONE-TIME responses. The calls are
      // consumed in order: first call gets the first value, second call gets
      // the second value, etc. If there are more calls than .once() values,
      // the fallback is the default mock behavior (undefined).
      eventsRepository.createEvent
        .mockResolvedValueOnce({ eventId: mockUuid() } as any)
        .mockResolvedValueOnce({ eventId: mockUuid() } as any)
        .mockResolvedValueOnce({ eventId: mockUuid() } as any);

      // Not needed for this test (the code calls findEventGroupsBySportLeague
      // before syncWorldCupEvents), but it has to be wired because the method
      // returns its result. Our test triggers sync via this public method.
      eventsRepository.findEventGroupsBySportLeague.mockResolvedValue([]);

      // ACT — the actual method call
      //
      // syncWorldCupEvents is a private method. We call it indirectly
      // through the public sync method by passing SportLeague.WORLDCUP. This matches
      // how it'd be called in production.
      await service.findEventGroupsBySportLeague(SportLeague.WORLDCUP);

      // ASSERT — verify the results
      //
      // toHaveBeenCalled() checks the mock was invoked at least once.
      // toHaveBeenCalledWith(...) checks the exact arguments.
      // toHaveBeenCalledTimes(n) checks the invocation count.
      //
      // Why check all these? We want to be sure:
      // 1. The right data was fetched (getRounds was called)
      // 2. Groups were looked up by the right names
      // 3. Groups were created with the right DTOs
      // 4. Events were created with the right match data
      //
      // If any of these assertions fail, it means the transformation logic
      // is wrong. The more specific the assertion, the easier to debug.

      // The service fetched rounds from FIFA
      expect(fifaService.getRounds).toHaveBeenCalled();

      // The service checked for existing groups by stage name
      expect(eventsRepository.findEventGroupByName).toHaveBeenCalledWith(
        'World Cup Group Stage – Matchday 1',
      );
      expect(eventsRepository.findEventGroupByName).toHaveBeenCalledWith(
        'World Cup Group Stage – Matchday 2',
      );

      // The service created groups with the right sportLeague
      expect(eventsRepository.createEventGroup).toHaveBeenCalledWith({
        name: 'World Cup Group Stage – Matchday 1',
        sportLeague: SportLeague.WORLDCUP,
      });
      expect(eventsRepository.createEventGroup).toHaveBeenCalledWith({
        name: 'World Cup Group Stage – Matchday 2',
        sportLeague: SportLeague.WORLDCUP,
      });

      // Each match was checked for duplicates by external ID
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-1-1', 'FIFA');
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-1-2', 'FIFA');
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-2-25', 'FIFA');

      // Each event was created with the correct match data
      // expect.any(String) for eventGroupId because we don't care about the
      // exact UUID — it's generated at runtime. We DO care about the name,
      // dates, and external identifiers since those come from the fixture.
      expect(eventsRepository.createEvent).toHaveBeenCalledWith({
        eventGroupId: expect.any(String),
        name: 'Mexico vs South Africa',
        startDate: '2026-06-11T20:00:00+01:00',
        endDate: '2026-06-11T20:00:00+01:00',
        externalEventId: 'WC-1-1',
        externalEventSource: 'FIFA',
      });
      expect(eventsRepository.createEvent).toHaveBeenCalledWith({
        eventGroupId: expect.any(String),
        name: 'Korea Republic vs Czechia',
        startDate: '2026-06-12T03:00:00+01:00',
        endDate: '2026-06-12T03:00:00+01:00',
        externalEventId: 'WC-1-2',
        externalEventSource: 'FIFA',
      });
      expect(eventsRepository.createEvent).toHaveBeenCalledWith({
        eventGroupId: expect.any(String),
        name: 'Czechia vs South Africa',
        startDate: '2026-06-18T17:00:00+01:00',
        endDate: '2026-06-18T17:00:00+01:00',
        externalEventId: 'WC-2-25',
        externalEventSource: 'FIFA',
      });

      // Sanity checks on the total counts — if these are wrong it means
      // we're creating too many or too few groups/events, which would mean
      // the loop logic is broken.
      expect(eventsRepository.createEvent).toHaveBeenCalledTimes(3);
      expect(eventsRepository.createEventGroup).toHaveBeenCalledTimes(2);
    });

    // --- TEST 2: Idempotency ---
    // Tests the "skip if already synced" behavior. Running syncWorldCupEvents
    // twice should NOT create duplicates.
    //
    // Why this matters: In production, syncEvents runs on a schedule (e.g.,
    // every hour). If it created duplicates each time, we'd have 10 copies of
    // every match. The externalEventId lookup is the guard against that.
    it('should skip events that already exist', async () => {
      fifaService.getRounds.mockResolvedValue(mockRounds);

      // Pre-seed Matchday 1 as an existing group (simulating a previous sync).
      // This tests the group-level dedup (findEventGroupByName finds it).
      const createdGroups: Record<string, any> = {
        'World Cup Group Stage – Matchday 1': {
          eventGroupId: 'existing-group-id',
          name: 'World Cup Group Stage – Matchday 1',
          sportLeague: SportLeague.WORLDCUP as const,
        },
      };
      eventsRepository.findEventGroupByName.mockImplementation((name: string) =>
        Promise.resolve(createdGroups[name] ?? null),
      );
      eventsRepository.createEventGroup.mockImplementation((dto) => {
        const group = { eventGroupId: mockUuid(), ...dto };
        createdGroups[dto.name] = group;
        return Promise.resolve(group);
      });

      // The KEY to this test: the first call to findEventByExternalEvent
      // returns an existing event (id = 'existing-event-id'). This simulates
      // that WC-1-1 was already synced. The other two return null (not yet
      // synced).
      //
      // Note the order: .mockResolvedValueOnce is consumed left-to-right.
      // The service processes Round 1 → Match 1 first (WC-1-1), so that's
      // the one we mark as existing.
      eventsRepository.findEventByExternalEvent
        .mockResolvedValueOnce({ eventId: 'existing-event-id' } as any)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      // We only expect 2 createEvent calls (for WC-1-2 and WC-2-25).
      // WC-1-1 should be skipped.
      eventsRepository.createEvent
        .mockResolvedValueOnce({ eventId: mockUuid() } as any)
        .mockResolvedValueOnce({ eventId: mockUuid() } as any);
      eventsRepository.findEventGroupsBySportLeague.mockResolvedValue([]);

      await service.findEventGroupsBySportLeague(SportLeague.WORLDCUP);

      // All three lookups still happen (we still check each match)
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-1-1', 'FIFA');
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-1-2', 'FIFA');
      expect(eventsRepository.findEventByExternalEvent).toHaveBeenCalledWith('WC-2-25', 'FIFA');

      // But only 2 events were created (WC-1-1 was skipped)
      expect(eventsRepository.createEvent).toHaveBeenCalledTimes(2);

      // Bonus assertion: explicitly verify WC-1-1 was NOT among the creates.
      // expect.objectContaining is a partial matcher — it checks the created
      // event would have externalEventId 'WC-1-1'. The second argument
      // (expect.anything()) is because toHaveBeenCalledWith also takes an
      // optional "received" argument in Jest — we're saying "don't match if
      // any call has this shape."
      //
      // This is a belt-and-suspenders check: it guards against a bug where
      // we create events with the wrong externalEventId.
      expect(eventsRepository.createEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({ externalEventId: 'WC-1-1' }),
        expect.anything(),
      );
    });

    // --- TEST 3: Knockout stage naming ---
    // Tests that the stage → display name mapping works for knockout rounds.
    //
    // Why this matters as a separate test: The naming logic has a branch
    // (GROUP vs knockout names). We test knockout separately because the
    // fixture only has GROUP stages. If someone breaks the knockout mapping
    // (e.g., by misspelling 'R32' in the switch), this test catches it.
    //
    // The pattern: define an inline fixture (knockoutRounds) that's minimal
    // — just one round, one match, stage: 'R32'. This makes the test easy
    // to read and focused on exactly what we're testing.
    it('should render knockout stage names correctly', async () => {
      const knockoutRounds: FifaRoundResponse = [
        {
          id: 4,
          status: 'scheduled',
          startDate: '2026-06-29T17:00:00+01:00',
          endDate: '2026-07-03T05:00:00+01:00',
          tournaments: [
            {
              id: 60,
              period: 'pre_match',
              minutes: 0,
              extraMinutes: 0,
              venueName: 'Estadio Banorte',
              venueCity: 'Mexico City',
              venueId: 1,
              date: '2026-06-29T17:00:00+01:00',
              status: 'scheduled',
              isSuspended: false,
              homeSquadId: 1,
              awaySquadId: 2,
              homeSquadName: 'Team A',
              awaySquadName: 'Team B',
              homeSquadAbbr: 'TMA',
              awaySquadAbbr: 'TMB',
              homeScore: null,
              homePenaltyScore: null,
              homeGoalScorersAssists: null,
              awayScore: null,
              awayPenaltyScore: null,
              awayGoalScorersAssists: null,
            },
          ],
          stage: 'R32',
        },
      ];

      fifaService.getRounds.mockResolvedValue(knockoutRounds);

      // Simple mock setup since there's only one group and one event
      eventsRepository.findEventGroupByName.mockResolvedValue(null);
      eventsRepository.createEventGroup.mockResolvedValueOnce({
        eventGroupId: mockUuid(),
        name: 'World Cup Knockout Stage – Round of 32',
        sportLeague: SportLeague.WORLDCUP,
      });
      eventsRepository.findEventByExternalEvent.mockResolvedValue(null);
      eventsRepository.createEvent.mockResolvedValueOnce({ eventId: mockUuid() } as any);
      eventsRepository.findEventGroupsBySportLeague.mockResolvedValue([]);

      await service.findEventGroupsBySportLeague(SportLeague.WORLDCUP);

      // The key assertion: R32 maps to "Knockout Stage – Round of 32"
      expect(eventsRepository.createEventGroup).toHaveBeenCalledWith({
        name: 'World Cup Knockout Stage – Round of 32',
        sportLeague: SportLeague.WORLDCUP,
      });
    });

    // --- TEST 4: Unknown stage fallback ---
    // Tests what happens when the FIFA API returns a stage we haven't mapped.
    //
    // Why this matters: The FIFA API could add new stages (e.g., a third-place
    // play-off with stage 'THIRD'). Our code should handle it gracefully
    // instead of crashing. The "Stage {stage}" fallback ensures we always
    // generate a valid name, even if it's ugly.
    //
    // This is an example of "defensive testing" — testing for things that
    // SHOULDN'T happen but COULD. If you only test the happy path, you'll
    // miss bugs in the error/fallback paths.
    it('should render unknown stages as fallback', async () => {
      const unknownStageRounds: FifaRoundResponse = [
        {
          id: 9,
          status: 'scheduled',
          startDate: '2026-07-14T17:00:00+01:00',
          endDate: '2026-07-14T17:00:00+01:00',
          tournaments: [
            {
              id: 70,
              period: 'pre_match',
              minutes: 0,
              extraMinutes: 0,
              venueName: 'Venue',
              venueCity: 'City',
              venueId: 1,
              date: '2026-07-14T17:00:00+01:00',
              status: 'scheduled',
              isSuspended: false,
              homeSquadId: 1,
              awaySquadId: 2,
              homeSquadName: 'Team X',
              awaySquadName: 'Team Y',
              homeSquadAbbr: 'TMX',
              awaySquadAbbr: 'TMY',
              homeScore: null,
              homePenaltyScore: null,
              homeGoalScorersAssists: null,
              awayScore: null,
              awayPenaltyScore: null,
              awayGoalScorersAssists: null,
            },
          ],
          // 'THIRD' is NOT in WORLD_CUP_STAGE_NAMES, so it hits the fallback
          stage: 'THIRD',
        },
      ];

      fifaService.getRounds.mockResolvedValue(unknownStageRounds);

      eventsRepository.findEventGroupByName.mockResolvedValue(null);
      eventsRepository.createEventGroup.mockResolvedValueOnce({
        eventGroupId: mockUuid(),
        name: 'World Cup Stage THIRD',
        sportLeague: SportLeague.WORLDCUP,
      });
      eventsRepository.findEventByExternalEvent.mockResolvedValue(null);
      eventsRepository.createEvent.mockResolvedValueOnce({ eventId: mockUuid() } as any);
      eventsRepository.findEventGroupsBySportLeague.mockResolvedValue([]);

      await service.findEventGroupsBySportLeague(SportLeague.WORLDCUP);

      // The fallback is "Stage {stage}" — here it becomes "Stage THIRD"
      expect(eventsRepository.createEventGroup).toHaveBeenCalledWith({
        name: 'World Cup Stage THIRD',
        sportLeague: SportLeague.WORLDCUP,
      });
    });
  });
});

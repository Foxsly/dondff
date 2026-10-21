import { IConnection } from '@nestia/fetcher';
import request from 'supertest';
import * as Leagues from '@/infrastructure/test/sdk/functional/leagues';
import { closeTestApp, createTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import { INestApplication } from '@nestjs/common';
import {
  userFactory,
  leagueSettingsFactory,
  ensureUser,
  ensureLeague,
  resetDatabase,
  ensureLeagueUsers,
  ensureLeagueSettingsVersion,
  ensureEventGroup,
  ensureLeagueWithOwner,
} from '@/infrastructure/test/factories';

describe('Leagues E2E', () => {
  let app: INestApplication;
  let conn: IConnection;

  beforeAll(async () => {
    app = await createTestApp();
    conn = { host: getBaseUrl(app) };
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  afterEach(async () => {
    await resetDatabase(app);
  });

  describe('POST /leagues — create', () => {
    it('creates a league and returns the persisted entity', async () => {
      // call the generated SDK helper for POST /leagues
      let leagueName = 'My League';
      const created = await ensureLeague(conn, { name: leagueName });

      // basic shape assertions
      expect(created).toBeDefined();
      expect(typeof created.leagueId).toBe('string');
      expect(created.leagueId.length).toBeGreaterThan(0);
      expect(created.name).toBe(leagueName);

      // fetch it back via GET /leagues/:id to ensure it persisted
      const fetched = await Leagues.findOne(conn, created.leagueId);
      expect(fetched).toBeDefined();
      expect(fetched.leagueId).toBe(created.leagueId);
      expect(fetched.name).toBe(leagueName);
    });
  });

  describe('League Users — add, list, update, remove', () => {
    it('manages league users for a league', async () => {
      // Arrange: create a league and an OWNER user
      const league = await ensureLeague(conn);
      const owner = await ensureUser(conn, userFactory());

      // Initially, no users in the league
      const emptyUsers = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(Array.isArray(emptyUsers)).toBe(true); // owner not yet linked until after add below
      expect(emptyUsers.length).toBe(0); // ensures test controls the memberships end-to-end

      // Add the OWNER membership explicitly
      const added = await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: owner.userId,
        role: 'owner',
      });
      expect(added.leagueId).toBe(league.leagueId);
      expect(added.userId).toBe(owner.userId);
      expect(added.role).toBe('owner');

      // List should contain exactly one user now
      const listedAfterAdd = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterAdd.length).toBe(1);
      expect(listedAfterAdd[0].userId).toBe(owner.userId);
      expect(listedAfterAdd[0].role).toBe('owner');

      // Add a second user as MEMBER using bulk helper
      const { users } = await ensureLeagueUsers(conn, league.leagueId, [
        { role: 'member', overrides: userFactory() },
      ]);
      const member = users[0].user;
      // sanity
      expect(users[0].role).toBe('member');

      // List should now contain both users
      const listedAfterSecondAdd = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(Array.isArray(listedAfterSecondAdd)).toBe(true);
      expect(listedAfterSecondAdd.length).toBe(2);
      const byId = Object.fromEntries(listedAfterSecondAdd.map((u) => [u.userId, u]));
      expect(byId[owner.userId].role).toBe('owner');
      expect(byId[member.userId].role).toBe('member');

      // Update original user role to MEMBER
      const updated = await Leagues.users.updateLeagueUser(conn, league.leagueId, owner.userId, {
        role: 'member',
      });
      expect(updated.role).toBe('member');

      const listedAfterUpdate = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterUpdate.length).toBe(2);
      const byIdAfterUpdate = Object.fromEntries(listedAfterUpdate.map((u) => [u.userId, u]));
      expect(byIdAfterUpdate[owner.userId].role).toBe('member');
      expect(byIdAfterUpdate[member.userId].role).toBe('member');

      // Remove the user
      const removed = await Leagues.users.removeLeagueUser(conn, league.leagueId, owner.userId);
      expect(removed).toBe(true);

      const listedAfterRemove = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterRemove.length).toBe(1);
    });
  });

  describe('League Users — remove twice', () => {
    it('returns 404 when removing the same user twice', async () => {
      const league = await ensureLeague(conn);
      const user = await ensureUser(conn, userFactory());

      await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: user.userId,
        role: 'owner',
      });

      // First removal succeeds
      const removed1 = await Leagues.users.removeLeagueUser(conn, league.leagueId, user.userId);
      expect(removed1).toBe(true);

      // Second removal should return a 404
      await expect(
        Leagues.users.removeLeagueUser(conn, league.leagueId, user.userId),
      ).rejects.toMatchObject({ status: 404 });
    });
  });

  describe('League Settings — create, latest, get by id', () => {
    it('creates settings, fetches latest, and retrieves by id', async () => {
      const league = await ensureLeague(conn);

      // Create v1 settings via helper
      const inputV1 = leagueSettingsFactory();
      const v1 = await ensureLeagueSettingsVersion(conn, league.leagueId, inputV1);
      expect(v1.leagueSettingsId).toBeDefined();
      expect(v1.leagueId).toBe(league.leagueId);
      expect(v1.scoringType).toBe(inputV1.scoringType);

      // Default positions are seeded server-side based on the league's sport.
      const positionsV1 = await Leagues.getLeaguePositions(conn, league.leagueId);
      expect(Array.isArray(positionsV1)).toBe(true);
      expect(positionsV1.length).toBeGreaterThan(0);
      expect(positionsV1.every((p) => p.leagueSettingsId === v1.leagueSettingsId)).toBe(true);

      // Create v2 settings (different scoring type) via helper
      const inputV2 = {
        ...inputV1,
        scoringType: 'HALF_PPR',
      } as const;
      const v2 = await ensureLeagueSettingsVersion(conn, league.leagueId, inputV2);
      expect(v2.leagueSettingsId).toBeDefined();
      expect(v2.leagueSettingsId).not.toBe(v1.leagueSettingsId);
      expect(v2.scoringType).toBe('HALF_PPR');

      // Latest should be the last-inserted settings
      const latest = await Leagues.settings.latest.getLatestLeagueSettings(conn, league.leagueId);
      expect(latest.scoringType).toBe('HALF_PPR');

      // Fetch by id (v1) should still return v1
      const roundtripV1 = await Leagues.settings.getLeagueSettingsById(conn, v1.leagueSettingsId);
      expect(roundtripV1.leagueSettingsId).toBe(v1.leagueSettingsId);
      expect(roundtripV1.scoringType).toBe(inputV1.scoringType);
    });
  });

  describe('GET /leagues — findAll', () => {
    it('returns all created leagues', async () => {
      const l1 = await ensureLeague(conn);
      const l2 = await ensureLeague(conn);
      const l3 = await ensureLeague(conn);

      const all = await Leagues.findAll(conn);
      const ids = new Set(all.map((x) => x.leagueId));
      expect(ids.has(l1.leagueId)).toBe(true);
      expect(ids.has(l2.leagueId)).toBe(true);
      expect(ids.has(l3.leagueId)).toBe(true);
    });
  });

  //
  // League Users — idempotent upsert semantics
  //
  describe('League Users — idempotent upsert', () => {
    it.skip('treats add as upsert: duplicate add updates role and does not create duplicates', async () => {
      const league = await ensureLeague(conn);
      const u = await ensureUser(conn, userFactory());

      // First add succeeds
      await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: u.userId,
        role: 'owner',
      });

      // Second add with different role should upsert/update to member (no duplicate, no error)
      const second = await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: u.userId,
        role: 'member',
      });
      expect(second.role).toBe('member');

      // Update non-existent membership should fail
      const randomUser = await ensureUser(conn, userFactory());
      await expect(
        Leagues.users.updateLeagueUser(conn, league.leagueId, randomUser.userId, {
          role: 'member',
        }),
      ).rejects.toBeDefined();

      // Remove non-existent membership should return false
      const removed = await Leagues.users.removeLeagueUser(
        conn,
        league.leagueId,
        randomUser.userId,
      );
      expect(removed).toBe(false);
    });
  });

  describe('League Settings — negative cases', () => {
    it('returns 404 for by-id when not found', async () => {
      await expect(
        Leagues.settings.getLeagueSettingsById(conn, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeDefined();
    });
  });

  //
  // 1) PATCH /leagues/:id — update league (happy, 404, bad payload)
  //
  describe('PATCH /leagues/:id — update league', () => {
    it('updates league name (happy path)', async () => {
      const created = await ensureLeague(conn);
      const newName = `${created.name} (updated)`;
      const updated = await Leagues.update(conn, created.leagueId, { name: newName });
      expect(updated.leagueId).toBe(created.leagueId);
      expect(updated.name).toBe(newName);

      const fetched = await Leagues.findOne(conn, created.leagueId);
      expect(fetched.name).toBe(newName);
    });

    it('returns NotFound (404-ish) for unknown league id', async () => {
      await expect(
        Leagues.update(conn, '00000000-0000-0000-0000-000000000000', { name: 'Nope' }),
      ).rejects.toBeDefined();
    });

    it('rejects invalid payload (empty name)', async () => {
      const created = await ensureLeague(conn);
      await expect(Leagues.update(conn, created.leagueId, { name: '' })).rejects.toBeDefined();
    });
  });

  //
  // 2) GET /leagues/:id/teams — empty-state (and TODO: populated-state)
  //
  describe.skip('GET /leagues/:id/teams — empty state', () => {
    it('returns an empty list when a league has no teams', async () => {
      const league = await ensureLeague(conn);
      const teams = await Leagues.teams.getLeagueTeams(conn, league.leagueId, 2025);
      expect(Array.isArray(teams)).toBe(true);
      expect(teams.length).toBe(0);
    });
  });
  // NOTE: populated-state test can be added once team creation helpers are confirmed in the SDK.

  //
  // 3) League Settings — cross-league safety
  //
  describe('League Settings — cross-league safety', () => {
    it('does not leak settings across leagues and ignores mismatched leagueId in body', async () => {
      // Create two leagues
      const leagueA = await ensureLeague(conn);
      const leagueB = await ensureLeague(conn);

      // Create settings for league A, but try to spoof leagueId in the body as leagueB
      const spoofedSettingsInput = {
        ...leagueSettingsFactory({ leagueId: leagueB.leagueId }), // spoofed
      };
      const createdA1 = await Leagues.settings.createLeagueSettings(
        conn,
        leagueA.leagueId, // authoritative path param
        spoofedSettingsInput,
      );
      // Server must honor path param: result should belong to league A, not B
      expect(createdA1.leagueId).toBe(leagueA.leagueId);
      expect(createdA1.leagueId).not.toBe(leagueB.leagueId);

      // By-id read returns the entity; ensure it still belongs to A (not B)
      const roundtrip = await Leagues.settings.getLeagueSettingsById(
        conn,
        createdA1.leagueSettingsId,
      );
      expect(roundtrip.leagueId).toBe(leagueA.leagueId);
      expect(roundtrip.leagueId).not.toBe(leagueB.leagueId);

      // Create a legit settings row for B and verify latest works for B now
      const createdB1 = await Leagues.settings.createLeagueSettings(
        conn,
        leagueB.leagueId,
        leagueSettingsFactory({ leagueId: leagueB.leagueId }),
      );
      const latestB = await Leagues.settings.latest.getLatestLeagueSettings(conn, leagueB.leagueId);
      expect(latestB.leagueSettingsId).toBe(createdB1.leagueSettingsId);
      expect(latestB.leagueId).toBe(leagueB.leagueId);
    });
  });

  //
  // League Settings — validation edges (explicit)
  //
  describe('League Settings — validation edges', () => {
    it('rejects invalid scoringType and seeds default positions for a valid payload', async () => {
      const league = await ensureLeague(conn);

      // invalid scoringType
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId }),
          scoringType: 'XYZ' as any,
        }),
      ).rejects.toBeDefined();

      // a valid payload still yields server-seeded, non-duplicate default positions
      const created = await Leagues.settings.createLeagueSettings(
        conn,
        league.leagueId,
        leagueSettingsFactory({ leagueId: league.leagueId }),
      );
      const positions = await Leagues.getLeaguePositions(conn, league.leagueId);
      expect(positions.length).toBeGreaterThan(0);
      expect(positions.every((p) => p.leagueSettingsId === created.leagueSettingsId)).toBe(true);
      expect(new Set(positions.map((p) => p.position)).size).toBe(positions.length);
    });
  });

  //
  // League Settings — latest under burst writes
  //
  describe('League Settings — latest under burst writes', () => {
    it('returns the true latest when multiple versions are created quickly', async () => {
      const league = await ensureLeague(conn);
      const v1 = await ensureLeagueSettingsVersion(conn, league.leagueId, {
        leagueId: league.leagueId,
        scoringType: 'STANDARD',
      });
      const v2 = await ensureLeagueSettingsVersion(conn, league.leagueId, {
        leagueId: league.leagueId,
        scoringType: 'HALF_PPR',
      });
      const v3 = await ensureLeagueSettingsVersion(conn, league.leagueId, {
        leagueId: league.leagueId,
        scoringType: 'PPR',
      });
      const latest = await Leagues.settings.latest.getLatestLeagueSettings(conn, league.leagueId);
      expect(latest.leagueSettingsId).toBe(v3.leagueSettingsId);
    });
  });

  //
  // 4) DELETE /leagues/:id — delete league (happy + 404)
  //
  describe('DELETE /leagues/:id — delete league', () => {
    it('deletes a league and subsequent fetch returns NotFound', async () => {
      const league = await ensureLeague(conn);
      await Leagues.remove(conn, league.leagueId);
      await expect(Leagues.findOne(conn, league.leagueId)).rejects.toBeDefined();
    });

    it('returns NotFound for unknown league id', async () => {
      await expect(
        Leagues.remove(conn, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeDefined();
    });

    it('returns NotFound when deleting the same league twice', async () => {
      const league = await ensureLeague(conn);
      // First delete succeeds
      await Leagues.remove(conn, league.leagueId);
      // Second delete should result in a NotFound-like rejection
      await expect(Leagues.remove(conn, league.leagueId)).rejects.toMatchObject({ status: 404 });
    });

    it('excludes a deleted league from findAll results', async () => {
      const l1 = await ensureLeague(conn);
      const l2 = await ensureLeague(conn);
      const l3 = await ensureLeague(conn);

      // Delete one of them
      await Leagues.remove(conn, l2.leagueId);

      // findAll should not include the deleted league
      const all = await Leagues.findAll(conn);
      const ids = new Set(all.map((x) => x.leagueId));
      expect(ids.has(l1.leagueId)).toBe(true);
      expect(ids.has(l2.leagueId)).toBe(false); // deleted
      expect(ids.has(l3.leagueId)).toBe(true);
    });
  });

  //
  // 5) League Settings — enum validation & temporal ordering
  //
  describe('League Settings — enum validation & temporal ordering', () => {
    it('rejects invalid scoringType and enforces temporal ordering for latest', async () => {
      const league = await ensureLeague(conn);

      // invalid scoringType -> 400
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId }),
          scoringType: 'INVALID_ENUM_VALUE' as any,
        }),
      ).rejects.toBeDefined();

      // create v1 and v2 with valid enums
      const v1 = await Leagues.settings.createLeagueSettings(
        conn,
        league.leagueId,
        leagueSettingsFactory({ leagueId: league.leagueId, scoringType: 'STANDARD' }),
      );
      const v2 = await Leagues.settings.createLeagueSettings(
        conn,
        league.leagueId,
        leagueSettingsFactory({ leagueId: league.leagueId, scoringType: 'HALF_PPR' }),
      );

      // Temporal invariants
      expect(v2.leagueSettingsId).not.toBe(v1.leagueSettingsId);

      // Latest should be v2
      const latest = await Leagues.settings.latest.getLatestLeagueSettings(conn, league.leagueId);
      expect(latest.leagueSettingsId).toBe(v2.leagueSettingsId);
      expect(latest.scoringType).toBe('HALF_PPR');
    });
  });

  //
  // 6) GET /leagues/:id/teams — populated state (SKIPPED until team creation helpers available)
  //
  describe.skip('GET /leagues/:id/teams — populated state', () => {
    it('returns created teams (and players if included)', async () => {
      // TODO: Replace with actual Teams SDK helpers and a teamFactory when available.
      // Example shape (pseudocode):
      //
      // const league = await Leagues.create(conn, { name: randomName() });
      // const t1 = await Teams.create(conn, { leagueId: league.leagueId, name: 'Alpha' });
      // const t2 = await Teams.create(conn, { leagueId: league.leagueId, name: 'Beta' });
      //
      // const teams = await Leagues.getLeagueTeams(conn, league.leagueId);
      // const names = teams.map(t => t.name).sort();
      // expect(names).toEqual(['Alpha', 'Beta']);
      //
      // If players are embedded, assert shape (ids, positions, etc.).
    });
  });

  //
  // 7) GET /leagues/:id/seasons/:season/highlights
  //
  describe('GET /leagues/:id/seasons/:season/highlights', () => {
    const SEASON = 2025;

    const createWeek = async (name: string, date: string) => {
      const group = await ensureEventGroup(conn, { name, seasonYear: SEASON });
      await request(app.getHttpServer())
        .post('/events')
        .send({
          eventGroupId: group.eventGroupId,
          name: `${name} game`,
          startDate: date,
          endDate: date,
          externalEventId: `${name}-${date}`,
          externalEventSource: 'SLEEPER',
        })
        .expect(201);
      return group.eventGroupId;
    };

    // Scores are seeded directly so finished weeks are already fully scored
    // and calculateAndPersistScores never reaches the stats provider.
    const createTeam = async (
      leagueId: string,
      userId: string,
      eventGroupId: string,
      players: Array<{ position: string; actualPoints?: number }>,
    ) => {
      const team = await request(app.getHttpServer())
        .post('/teams')
        .send({ leagueId, userId, seasonYear: SEASON, eventGroupId })
        .expect(201);
      for (const player of players) {
        await request(app.getHttpServer())
          .put(`/teams/${team.body.teamId}/players`)
          .send({
            teamId: team.body.teamId,
            position: player.position,
            playerId: `${player.position}-${userId.slice(0, 8)}-${eventGroupId.slice(0, 8)}`,
            playerName: `${player.position} of ${userId.slice(0, 4)}`,
            projectedPoints: 10,
            ...(player.actualPoints != null && { actualPoints: player.actualPoints }),
          })
          .expect(200);
      }
      return team.body.teamId as string;
    };

    it('ranks lineups, positions and users across finished weeks, crediting ties', async () => {
      const league = await ensureLeague(conn);
      const positions = await request(app.getHttpServer())
        .get(`/leagues/${league.leagueId}/positions`)
        .expect(200);
      expect(positions.body.map((p: any) => p.position)).toEqual(['RB', 'WR']);

      const { users } = await ensureLeagueUsers(conn, league.leagueId, [
        { role: 'owner' },
        { role: 'member' },
        { role: 'member' },
      ]);
      const [alice, bob, carol] = users.map((u) => u.user.userId as string);

      const week1 = await createWeek('1', '2025-09-07');
      const week2 = await createWeek('2', '2025-09-14');
      const week3 = await createWeek('3', '2099-09-14');

      // Week 1: Alice and Bob tie at 30; Carol never finished her lineup.
      await createTeam(league.leagueId, alice, week1, [
        { position: 'RB', actualPoints: 20 },
        { position: 'WR', actualPoints: 10 },
      ]);
      await createTeam(league.leagueId, bob, week1, [
        { position: 'RB', actualPoints: 15 },
        { position: 'WR', actualPoints: 15 },
      ]);
      await createTeam(league.leagueId, carol, week1, [{ position: 'RB', actualPoints: 25 }]);
      // Week 2: Alice wins outright with the season-best lineup.
      const aliceWeek2 = await createTeam(league.leagueId, alice, week2, [
        { position: 'RB', actualPoints: 8 },
        { position: 'WR', actualPoints: 30.5 },
      ]);
      await createTeam(league.leagueId, bob, week2, [
        { position: 'RB', actualPoints: 12 },
        { position: 'WR', actualPoints: 12 },
      ]);
      // Week 3 is upcoming: counts as played, never scored.
      await createTeam(league.leagueId, alice, week3, [{ position: 'RB' }, { position: 'WR' }]);

      const res = await request(app.getHttpServer())
        .get(`/leagues/${league.leagueId}/seasons/${SEASON}/highlights`)
        .expect(200);

      expect(res.body.seasonYear).toBe(SEASON);
      expect(res.body.finishedEventGroups).toBe(2);
      expect(res.body.topLineup).toMatchObject({
        teamId: aliceWeek2,
        userId: alice,
        eventGroupId: week2,
        eventGroupName: '2',
        totalPoints: 38.5,
      });
      expect(res.body.topLineup.players.map((p: any) => [p.position, p.actualPoints])).toEqual([
        ['RB', 8],
        ['WR', 30.5],
      ]);
      // Carol's lone RB score still counts as an individual highlight.
      expect(
        res.body.topByPosition.map((p: any) => [p.position, p.actualPoints, p.userId, p.eventGroupId]),
      ).toEqual([
        ['RB', 25, carol, week1],
        ['WR', 30.5, alice, week2],
      ]);
      expect(res.body.userStats).toEqual([
        { userId: alice, weeksPlayed: 3, wins: 2, totalPoints: 68.5, averagePoints: 34.25, bestScore: 38.5 },
        { userId: bob, weeksPlayed: 2, wins: 1, totalPoints: 54, averagePoints: 27, bestScore: 30 },
        { userId: carol, weeksPlayed: 0, wins: 0, totalPoints: 0, averagePoints: null, bestScore: null },
      ]);
    });

    it('returns empty highlights for a season with no teams', async () => {
      const { league, owner } = await ensureLeagueWithOwner(conn);
      const res = await request(app.getHttpServer())
        .get(`/leagues/${league.leagueId}/seasons/${SEASON}/highlights`)
        .expect(200);
      expect(res.body).toEqual({
        seasonYear: SEASON,
        finishedEventGroups: 0,
        topLineup: null,
        topByPosition: [],
        userStats: [
          { userId: owner.userId, weeksPlayed: 0, wins: 0, totalPoints: 0, averagePoints: null, bestScore: null },
        ],
      });
    });

    it('returns 404 for an unknown league', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leagues/${crypto.randomUUID()}/seasons/${SEASON}/highlights`)
        .expect(404);
      expect(res.body.statusCode).toBe(404);
    });

    it('returns 400 for a non-numeric season', async () => {
      const league = await ensureLeague(conn);
      await request(app.getHttpServer())
        .get(`/leagues/${league.leagueId}/seasons/abc/highlights`)
        .expect(400);
    });
  });
});

import { IConnection } from '@nestia/fetcher';
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
    const expectIso = (s: string) => {
      // Basic ISO sanity: toISOString round-trip shouldn't throw
      expect(typeof s).toBe('string');
      const d = new Date(s);
      expect(Number.isNaN(d.getTime())).toBe(false);
      expect(d.toISOString()).toBe(s);
    };

    it('creates settings, fetches latest, and retrieves by id', async () => {
      const league = await ensureLeague(conn);

      // Create v1 settings via helper
      const inputV1 = leagueSettingsFactory(); // keep for expectation symmetry
      const v1 = await ensureLeagueSettingsVersion(conn, league.leagueId, inputV1);
      expect(v1.leagueSettingsId).toBeDefined();
      expect(v1.leagueId).toBe(league.leagueId);
      expect(v1.scoringType).toBe(inputV1.scoringType);
      expect(v1.positions).toEqual(inputV1.positions);
      expect(v1.rbPoolSize).toBe(inputV1.rbPoolSize);
      expectIso(v1.createdAt);
      expectIso(v1.updatedAt);

      // Create v2 settings (change pool sizes and positions order slightly) via helper
      const inputV2 = {
        ...inputV1,
        rbPoolSize: 28,
        wrPoolSize: 40,
        positions: ['QB', 'RB', 'WR', 'FLEX', 'TE', 'DST'], // unique order, no duplicates
      };
      const v2 = await ensureLeagueSettingsVersion(conn, league.leagueId, inputV2);
      expect(v2.leagueSettingsId).toBeDefined();
      expect(v2.leagueSettingsId).not.toBe(v1.leagueSettingsId);
      expect(v2.positions).toEqual(inputV2.positions);

      // Latest should be v2
      const latest = await Leagues.settings.latest.getLatestLeagueSettings(conn, league.leagueId);
      expect(latest.leagueSettingsId).toBe(v2.leagueSettingsId);
      expect(latest.positions).toEqual(inputV2.positions);

      // Fetch by id (v1) should still return v1
      const roundtripV1 = await Leagues.settings.getLeagueSettingsById(conn, v1.leagueSettingsId);
      expect(roundtripV1.leagueSettingsId).toBe(v1.leagueSettingsId);
      expect(roundtripV1.positions).toEqual(inputV1.positions);
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
    it('returns 404 for latest and by-id when not found, and 400 on invalid payload', async () => {
      const league = await ensureLeague(conn);

      // latest when none exist -> NotFound
      await expect(
        Leagues.settings.latest.getLatestLeagueSettings(conn, league.leagueId),
      ).rejects.toBeDefined();

      // by id unknown -> NotFound
      await expect(
        Leagues.settings.getLeagueSettingsById(conn, '00000000-0000-0000-0000-000000000000'),
      ).rejects.toBeDefined();

      // invalid DTO -> 400 (empty positions)
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          leagueId: league.leagueId,
          scoringType: 'PPR',
          positions: [],
          rbPoolSize: 0,
          wrPoolSize: 0,
          qbPoolSize: 0,
          tePoolSize: 0,
        }),
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
      const teams = await Leagues.teams.getLeagueTeams(conn, league.leagueId);
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

      // League B "latest" should not see A's settings
      await expect(
        Leagues.settings.latest.getLatestLeagueSettings(conn, leagueB.leagueId),
      ).rejects.toBeDefined();

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
    it('rejects invalid scoringType, duplicate/empty positions, and negative pool sizes', async () => {
      const league = await ensureLeague(conn);

      // invalid scoringType
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId }),
          scoringType: 'XYZ' as any,
        }),
      ).rejects.toBeDefined();

      // empty positions
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId, positions: [] }),
        }),
      ).rejects.toBeDefined();

      // duplicate positions (if enforced)
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId, positions: ['QB', 'QB'] }),
        }),
      ).rejects.toBeDefined();

      // negative pool sizes
      await expect(
        Leagues.settings.createLeagueSettings(conn, league.leagueId, {
          ...leagueSettingsFactory({ leagueId: league.leagueId, rbPoolSize: -1 }),
        }),
      ).rejects.toBeDefined();
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
      // Small delay to ensure distinct timestamps in case DB truncates precision
      await new Promise((r) => setTimeout(r, 10));
      const v2 = await Leagues.settings.createLeagueSettings(
        conn,
        league.leagueId,
        leagueSettingsFactory({ leagueId: league.leagueId, scoringType: 'HALF_PPR' }),
      );

      // Temporal invariants
      const t1c = new Date(v1.createdAt).getTime();
      const t2c = new Date(v2.createdAt).getTime();
      expect(t2c).toBeGreaterThan(t1c);
      expect(new Date(v1.updatedAt).getTime()).toBeGreaterThanOrEqual(t1c);
      expect(new Date(v2.updatedAt).getTime()).toBeGreaterThanOrEqual(t2c);

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
});

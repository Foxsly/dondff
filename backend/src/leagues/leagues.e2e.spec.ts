import { IConnection } from '@nestia/fetcher';
import * as Leagues from '@/infrastructure/test/sdk/functional/leagues';
import { closeTestApp, createTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import { INestApplication } from '@nestjs/common';
import * as Users from '@/infrastructure/test/sdk/functional/users';
import { userFactory, leagueSettingsFactory } from '@/infrastructure/test/factories';

const randomName = () => `Test League ${Math.random().toString(36).slice(2, 8)}`;

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
    const reset = (app as any).__reset__ as undefined | (() => Promise<void>);
    if (reset) await reset();
  });

  describe('POST /leagues — create', () => {
    it('creates a league and returns the persisted entity', async () => {
      const name = randomName();

      // call the generated SDK helper for POST /leagues
      const created = await Leagues.create(conn, { name });

      // basic shape assertions
      expect(created).toBeDefined();
      expect(typeof created.leagueId).toBe('string');
      expect(created.leagueId.length).toBeGreaterThan(0);
      expect(created.name).toBe(name);

      // fetch it back via GET /leagues/:id to ensure it persisted
      const fetched = await Leagues.findOne(conn, created.leagueId);
      expect(fetched).toBeDefined();
      expect(fetched.leagueId).toBe(created.leagueId);
      expect(fetched.name).toBe(name);
    });
  });

  describe('League Users — add, list, update, remove', () => {
    it('manages league users for a league', async () => {
      // Arrange: create a league and a user
      const league = await Leagues.create(conn, { name: randomName() });
      const userInput = userFactory();
      const user = await Users.create(conn, userInput);

      // Initially, no users in the league
      const emptyUsers = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(Array.isArray(emptyUsers)).toBe(true);
      expect(emptyUsers.length).toBe(0);

      // Add the user as OWNER
      const added = await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: user.userId,
        role: 'owner',
      });
      expect(added.leagueId).toBe(league.leagueId);
      expect(added.userId).toBe(user.userId);
      expect(added.role).toBe('owner');

      // List should contain exactly one user now
      const listedAfterAdd = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterAdd.length).toBe(1);
      expect(listedAfterAdd[0].userId).toBe(user.userId);
      expect(listedAfterAdd[0].role).toBe('owner');

      // Add a second user as MEMBER
      const userInput2 = userFactory();
      const user2 = await Users.create(conn, userInput2);
      const added2 = await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: user2.userId,
        role: 'member',
      });
      expect(added2.leagueId).toBe(league.leagueId);
      expect(added2.userId).toBe(user2.userId);
      expect(added2.role).toBe('member');

      // List should now contain both users
      const listedAfterSecondAdd = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(Array.isArray(listedAfterSecondAdd)).toBe(true);
      expect(listedAfterSecondAdd.length).toBe(2);
      const byId = Object.fromEntries(listedAfterSecondAdd.map((u) => [u.userId, u]));
      expect(byId[user.userId].role).toBe('owner');
      expect(byId[user2.userId].role).toBe('member');

      // Update original user role to MEMBER
      const updated = await Leagues.users.updateLeagueUser(conn, league.leagueId, user.userId, {
        role: 'member',
      });
      expect(updated.role).toBe('member');

      const listedAfterUpdate = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterUpdate.length).toBe(2);
      const byIdAfterUpdate = Object.fromEntries(listedAfterUpdate.map((u) => [u.userId, u]));
      expect(byIdAfterUpdate[user.userId].role).toBe('member');
      expect(byIdAfterUpdate[user2.userId].role).toBe('member');

      // Remove the user
      const removed = await Leagues.users.removeLeagueUser(conn, league.leagueId, user.userId);
      expect(removed).toBe(true);

      const listedAfterRemove = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterRemove.length).toBe(1);
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
      const league = await Leagues.create(conn, { name: randomName() });

      // Create v1 settings
      const inputV1 = leagueSettingsFactory();
      const v1 = await Leagues.settings.createLeagueSettings(conn, league.leagueId, inputV1);
      expect(v1.leagueSettingsId).toBeDefined();
      expect(v1.leagueId).toBe(league.leagueId);
      expect(v1.scoringType).toBe(inputV1.scoringType);
      expect(v1.positions).toEqual(inputV1.positions);
      expect(v1.rbPoolSize).toBe(inputV1.rbPoolSize);
      expectIso(v1.createdAt);
      expectIso(v1.updatedAt);

      // Create v2 settings (change pool sizes and positions order slightly)
      const inputV2 = {
        ...inputV1,
        rbPoolSize: 28,
        wrPoolSize: 40,
        positions: ['QB', 'RB', 'WR', 'WR', 'TE', 'FLEX'],
      };
      const v2 = await Leagues.settings.createLeagueSettings(conn, league.leagueId, inputV2);
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
      const l1 = await Leagues.create(conn, { name: randomName() });
      const l2 = await Leagues.create(conn, { name: randomName() });
      const l3 = await Leagues.create(conn, { name: randomName() });

      const all = await Leagues.findAll(conn);
      const ids = new Set(all.map((x) => x.leagueId));
      expect(ids.has(l1.leagueId)).toBe(true);
      expect(ids.has(l2.leagueId)).toBe(true);
      expect(ids.has(l3.leagueId)).toBe(true);
    });
  });

  describe('League Users — negative & idempotency', () => {
    it('rejects duplicate add for same user, rejects update for unknown user, and returns false on remove unknown', async () => {
      const league = await Leagues.create(conn, { name: randomName() });
      const userA = await Users.create(conn, userFactory());

      // First add succeeds
      await Leagues.users.addLeagueUser(conn, league.leagueId, {
        userId: userA.userId,
        role: 'owner',
      });

      // Duplicate add should fail (current behavior is DB unique violation bubbling up)
      await expect(
        Leagues.users.addLeagueUser(conn, league.leagueId, { userId: userA.userId, role: 'owner' }),
      ).rejects.toBeDefined();

      // Update non-existent membership should fail
      const randomUser = await Users.create(conn, userFactory());
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
      const league = await Leagues.create(conn, { name: randomName() });

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
});

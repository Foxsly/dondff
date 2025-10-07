import { IConnection } from '@nestia/fetcher';
import * as Leagues from '@/infrastructure/test/sdk/functional/leagues';
import { closeTestApp, createTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import { INestApplication } from '@nestjs/common';
import * as Users from '@/infrastructure/test/sdk/functional/users';
import { userFactory } from '@/infrastructure/test/factories';

const randomName = () => `Test League ${Math.random().toString(36).slice(2, 8)}`;

describe('Leagues E2E via SDK', () => {
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

      // Update their role to MEMBER
      const updated = await Leagues.users.updateLeagueUser(conn, league.leagueId, user.userId, {
        role: 'member',
      });
      expect(updated.role).toBe('member');

      const listedAfterUpdate = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterUpdate.length).toBe(1);
      expect(listedAfterUpdate[0].role).toBe('member');

      // Remove the user
      const removed = await Leagues.users.removeLeagueUser(conn, league.leagueId, user.userId);
      expect(removed).toBe(true);

      const listedAfterRemove = await Leagues.users.findLeagueUsers(conn, league.leagueId);
      expect(listedAfterRemove.length).toBe(0);
    });
  });
});

import { IConnection } from '@nestia/fetcher';
import * as Leagues from '@/infrastructure/test/sdk/functional/leagues';
import { closeTestApp, createTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import { INestApplication } from '@nestjs/common';

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
});

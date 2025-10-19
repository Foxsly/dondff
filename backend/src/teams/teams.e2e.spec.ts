import { INestApplication } from '@nestjs/common';
import { IConnection } from '@nestia/fetcher';
import { createTestApp, closeTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import * as Teams from '../infrastructure/test/sdk/functional/teams';
import * as Users from '../infrastructure/test/sdk/functional/users';
import * as Leagues from '../infrastructure/test/sdk/functional/leagues';
import { teamFactory, userFactory, leagueFactory } from '@/infrastructure/test/factories';
import { HttpError } from '../infrastructure/test/sdk/HttpError';
import { randomUUID } from 'crypto';

describe('Teams E2E', () => {
  let app: INestApplication;
  let conn: IConnection;

  beforeAll(async () => {
    app = await createTestApp();
    conn = { host: getBaseUrl(app) };
  });

  afterEach(async () => {
    // Best-effort DB reset between tests if the hook is exposed
    const reset = (app as any)['__reset__'];
    if (typeof reset === 'function') {
      await reset();
    }
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  /**
   * Helpers: create preconditions and teams with real FKs.
   */
  async function createUserAndLeague() {
    const user = await Users.create(conn, userFactory());
    expect(user.userId).toBeDefined();

    const league = await Leagues.create(conn, leagueFactory());
    expect(league.leagueId).toBeDefined();

    return { user, league };
  }

  async function createTeamWithFKs() {
    const { user, league } = await createUserAndLeague();
    const dto = teamFactory({ userId: user.userId, leagueId: league.leagueId });
    const created = await Teams.create(conn, dto);
    expect(created.teamId).toBeDefined();
    return { created, dto, user, league };
  }

  it('CREATE: should create a team with valid user/league FKs', async () => {
    const { created, dto, user, league } = await createTeamWithFKs();
    expect(typeof created.teamId).toBe('string');
    expect(created).toEqual(
      expect.objectContaining({
        leagueId: league.leagueId,
        userId: user.userId,
        seasonYear: dto.seasonYear,
        week: dto.week,
      }),
    );
  });

  it('LIST: should list teams and include the created team', async () => {
    const { created } = await createTeamWithFKs();
    const all = await Teams.findAll(conn);
    expect(Array.isArray(all)).toBe(true);
    expect(all.some((t) => t.teamId === created.teamId)).toBe(true);
  });

  it('READ: should fetch a team by id and expose players array', async () => {
    const { created } = await createTeamWithFKs();
    const one = await Teams.findOne(conn, created.teamId);
    expect(one).toBeDefined();
    expect(one.teamId).toBe(created.teamId);
    // read model should expose players as an array (may be empty)
    expect(Array.isArray((one as any).players)).toBe(true);
  });

  it('UPDATE: should update team fields and reflect on subsequent reads', async () => {
    const { created } = await createTeamWithFKs();
    const nextWeek = (created.week ?? 1) + 1;
    const updated = await Teams.update(conn, created.teamId, { week: nextWeek } as any);
    expect(updated.teamId).toBe(created.teamId);
    expect(updated.week).toBe(nextWeek);
    const refetched = await Teams.findOne(conn, created.teamId);
    expect(refetched.week).toBe(nextWeek);
  });

  it('DELETE: should remove team and exclude it from subsequent listings', async () => {
    const { created } = await createTeamWithFKs();
    await Teams.remove(conn, created.teamId);
    const all = await Teams.findAll(conn);
    expect(all.some((t) => t.teamId === created.teamId)).toBe(false);
  });
  describe('NEGATIVE', () => {
    it('UPDATE (404): should return NotFound for non-existent team id', async () => {
      const missingId = randomUUID();
      try {
        await Teams.update(conn, missingId, { week: 99 } as any);
        // If we reached here, no error was thrown, which is a failure.
        throw new Error('Expected 404 HttpError but update resolved');
      } catch (err: any) {
        expect(err instanceof HttpError).toBe(true);
        if (err instanceof HttpError) {
          expect(err.status).toBe(404);
          // Optional assertions if available:
          // expect(err.method).toBe('PATCH');
          // expect(err.path).toMatch(/\/teams\/.+/);
        }
      }
    });

    it('DELETE (404): should return NotFound for non-existent team id', async () => {
      const missingId = randomUUID();
      try {
        await Teams.remove(conn, missingId);
        // If we reached here, no error was thrown, which is a failure.
        throw new Error('Expected 404 HttpError but remove resolved');
      } catch (err: any) {
        expect(err instanceof HttpError).toBe(true);
        if (err instanceof HttpError) {
          expect(err.status).toBe(404);
          // Optional assertions if available:
          // expect(err.method).toBe('DELETE');
        }
      }
    });
  });
});

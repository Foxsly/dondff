// Add E2E tests for teams module
import { INestApplication } from '@nestjs/common';
import { IConnection } from '@nestia/fetcher';
import { createTestApp, closeTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import * as Teams from '@/infrastructure/test/sdk/functional/teams';
import { ensureTeamWithFKs, resetDatabase, buildTeamUpdateDto } from '@/infrastructure/test/factories';
import { HttpError } from '../infrastructure/test/sdk/HttpError';
import { randomUUID } from 'crypto';
import { SleeperService } from '@/sleeper/sleeper.service';
import nock from 'nock';
import projectionsRaw from '@/sleeper/__fixtures__/sleeper-projections.raw.test.json';

function expectHttp404(err: any, method: string) {
  expect(err instanceof HttpError).toBe(true);
  if (err instanceof HttpError) {
    const code = (err as any).status ?? (err as any).statusCode;
    expect(code).toBe(404);
    if ('method' in err) expect((err as any).method).toBe(method);
    if ('path' in err) expect((err as any).path).toMatch(/\/teams\/.+/);
  }
}

describe('Teams E2E', () => {
  let app: INestApplication;
  let conn: IConnection;

  beforeAll(async () => {
    app = await createTestApp();
    conn = { host: getBaseUrl(app) };

    // Mock SleeperService API calls using nock
    nock('https://api.sleeper.app')
      .get(/\/projections\/nfl\/2025\/1$/)
      .query(true)
      .reply(200, projectionsRaw as any);
  });

  afterEach(async () => {
    await resetDatabase(app);
    nock.cleanAll(); // Clean up nock mocks between tests
  });

  afterAll(async () => {
    await closeTestApp(app);
    nock.restore(); // Restore nock to original state
  });

  async function createTeamWithFKs() {
    return ensureTeamWithFKs(conn);
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
    const updated = await Teams.update(conn, created.teamId, buildTeamUpdateDto({ week: nextWeek }) as any);
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
        await Teams.update(conn, missingId, buildTeamUpdateDto({ week: 99 }) as any);
        // If we reached here, no error was thrown, which is a failure.
        throw new Error('Expected 404 HttpError but update resolved');
      } catch (err: any) {
        expectHttp404(err, 'PATCH');
      }
    });

    it('READ (404): should return NotFound for non-existent team id', async () => {
      const missingId = randomUUID();
      try {
        await Teams.findOne(conn, missingId);
        // If we reached here, no error was thrown, which is a failure.
        throw new Error('Expected 404 HttpError but read resolved');
      } catch (err: any) {
        expectHttp404(err, 'GET');
      }
    });

    it('DELETE (404): should return NotFound for non-existent team id', async () => {
      const missingId = randomUUID();
      try {
        await Teams.remove(conn, missingId);
        // If we reached here, no error was thrown, which is a failure.
        throw new Error('Expected 404 HttpError but remove resolved');
      } catch (err: any) {
        expectHttp404(err, 'DELETE');
      }
    });
  });
});

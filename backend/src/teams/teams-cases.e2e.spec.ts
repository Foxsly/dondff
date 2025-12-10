import { HttpError } from '@/infrastructure/test/sdk';
import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createTestApp, closeTestApp, getBaseUrl } from '@/infrastructure/test/app.factory';
import { resetDatabase } from '@/infrastructure/test/factories';
import { IConnection } from '@nestia/fetcher';
import * as TeamCases from '@/infrastructure/test/sdk/functional/teams/cases';

function expectHttp404(err: any, method: string) {
  expect(err instanceof HttpError).toBe(true);
  if (err instanceof HttpError) {
    const code = (err as any).status ?? (err as any).statusCode;
    expect(code).toBe(404);
    if ('method' in err) expect((err as any).method).toBe(method);
    if ('path' in err) expect((err as any).path).toMatch(/\/teams\/.+/);
  }
}

describe('Teams Cases E2E', () => {
  let app: INestApplication;
  let conn: IConnection;

  beforeAll(async () => {
    app = await createTestApp();
    conn = { host: getBaseUrl(app) };
  });

  afterEach(async () => {
    await resetDatabase(app);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('GET /teams/:teamId/cases should return 404 when no entry exists for team/position', async () => {
    const teamId = randomUUID();

    try {
      await TeamCases.getTeamCases(conn, teamId, 'RB');
      // If we reached here, no error was thrown, which is a failure.
      throw new Error('Expected 404 HttpError but update resolved');
    } catch (err: any) {
      expectHttp404(err, 'GET');
    }
  });

  // NOTE: a happy-path test that seeds a team, entry, and audits
  // should be added once the game-flow wiring is complete.
});

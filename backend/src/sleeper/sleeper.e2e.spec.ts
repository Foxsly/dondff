import request from 'supertest';
import nock from 'nock';
import type { INestApplication } from '@nestjs/common';
import { closeTestApp, createTestApp } from '@/infrastructure/test/app.factory';
import { SleeperModule } from '@/sleeper/sleeper.module';
import stateResponse from './__fixtures__/sleeper-state.test.json';
import statsRaw from './__fixtures__/sleeper-stats.raw.test.json';
import statsTransformed from './__fixtures__/sleeper-stats.transformed.test.json';
import projectionsRaw from './__fixtures__/sleeper-projections.raw.test.json';
import projectionsTransformed from './__fixtures__/sleeper-projections.transformed.test.json';

describe('Sleeper (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp(SleeperModule);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  // If other tests mutate DB, reset between tests
  afterEach(async () => {
    const reset = (app as any).__reset__ as undefined | (() => Promise<void>);
    if (reset) await reset();
    nock.cleanAll(); // ensure mocks reset between tests
  });

  it('GET /sleeper/state returns transformed state (mocked)', async () => {
    // Arrange: mock external Sleeper API
    nock('https://api.sleeper.app')
      .get(/^\/(v1\/)?state\/nfl$/)
      .reply(200, stateResponse);

    const res = await request(app.getHttpServer()).get('/sleeper/state').expect(200);
    // Remove `season_has_scores` from the expected object
    // Option 1: rest spread
    const { season_has_scores, ...expected } = stateResponse;
    // No translation, just passing everything through
    expect(res.body).toEqual(expected);
  });

  it('GET /sleeper/stats/:year/:week returns transformed stats (mocked)', async () => {
    // Arrange: mock for Sleeper stats endpoint used by your service
    nock('https://api.sleeper.app')
      .get(/^\/(v1\/)?stats\/nfl\/2025\/1$/)
      .query(true) // accept any query string (season_type, position, order_by, etc.)
      .reply(200, statsRaw as any);

    // Act
    const res = await request(app.getHttpServer())
      .get('/sleeper/stats/2025/1?position=RB')
      .expect(200);

    // Assert: exact transformed shape
    expect(res.body).toEqual(statsTransformed);
  });

  it('GET /sleeper/projections/:year/:week returns transformed projections (mocked)', async () => {
    // Arrange: mock for Sleeper projections endpoint
    nock('https://api.sleeper.app')
      .get(/^\/(v1\/)?projections\/nfl\/2025\/1$/)
      .query(true)
      .reply(200, projectionsRaw as any);

    // Act
    const res = await request(app.getHttpServer())
      .get('/sleeper/projections/2025/1?position=RB')
      .expect(200);

    // Assert: exact transformed shape
    expect(res.body).toEqual(projectionsTransformed);
  });
});

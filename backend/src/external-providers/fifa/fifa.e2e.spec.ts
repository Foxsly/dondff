import request from 'supertest';
import nock from 'nock';
import type { INestApplication } from '@nestjs/common';
import { closeTestApp, createTestApp } from '@/infrastructure/test/app.factory';
import { FifaModule } from '@/external-providers/fifa/fifa.module';
import { resetDatabase } from '@/infrastructure/test/factories';
import roundsFixture from './__fixtures__/fifa-rounds.test.json';
import playersFixture from './__fixtures__/fifa-players.test.json';
import squadsFixture from './__fixtures__/fifa-squads.test.json';
import projectionsFixture from './__fixtures__/fifa-projections.transformed.test.json';

describe('Fifa (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp(FifaModule);
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  afterEach(async () => {
    await resetDatabase(app);
    nock.cleanAll();
  });

  it('GET /fifa/rounds returns rounds (mocked)', async () => {
    nock('https://play.fifa.com')
      .get(/\/json\/fantasy\/rounds\.json$/)
      .reply(200, roundsFixture);

    const res = await request(app.getHttpServer()).get('/fifa/rounds').expect(200);

    expect(res.body).toEqual(roundsFixture);
  });

  it('GET /fifa/players returns players (mocked)', async () => {
    nock('https://play.fifa.com')
      .get(/\/json\/fantasy\/players\.json$/)
      .reply(200, playersFixture as any);

    const res = await request(app.getHttpServer()).get('/fifa/players').expect(200);

    expect(res.body).toEqual(playersFixture);
  });

  it('GET /fifa/squads returns squads (mocked)', async () => {
    nock('https://play.fifa.com')
      .get(/\/json\/fantasy\/squads\.json$/)
      .reply(200, squadsFixture as any);

    const res = await request(app.getHttpServer()).get('/fifa/squads').expect(200);

    expect(res.body).toEqual(squadsFixture);
  });

  it('GET /fifa/rounds/:roundId/projections returns merged projections (mocked)', async () => {
    nock('https://play.fifa.com')
      .get(/\/json\/fantasy\/rounds\.json$/)
      .reply(200, roundsFixture)
      .get(/\/json\/fantasy\/players\.json$/)
      .reply(200, playersFixture as any)
      .get(/\/json\/fantasy\/squads\.json$/)
      .reply(200, squadsFixture as any);

    const res = await request(app.getHttpServer())
      .get('/fifa/rounds/1/projections')
      .expect(200);

    expect(res.body).toEqual(projectionsFixture);
  });

  it('GET /fifa/rounds/:roundId/projections returns empty for unknown round', async () => {
    nock('https://play.fifa.com')
      .get(/\/json\/fantasy\/rounds\.json$/)
      .reply(200, roundsFixture)
      .get(/\/json\/fantasy\/players\.json$/)
      .reply(200, playersFixture as any)
      .get(/\/json\/fantasy\/squads\.json$/)
      .reply(200, squadsFixture as any);

    const res = await request(app.getHttpServer())
      .get('/fifa/rounds/999/projections')
      .expect(200);

    expect(res.body).toEqual([]);
  });
});

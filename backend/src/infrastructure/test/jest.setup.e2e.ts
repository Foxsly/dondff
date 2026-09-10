import 'reflect-metadata';
import nock from 'nock';

beforeAll(() => {
  // E2E runs against PGlite (Postgres) — force the Postgres branch in DB_ENGINE-gated code
  process.env.DB_ENGINE = 'postgres';
  // Block all external HTTP except localhost for supertest
  nock.disableNetConnect();
  nock.enableNetConnect((host) => host.includes('127.0.0.1') || host.includes('localhost'));
});

afterEach(() => {
  nock.cleanAll();
});

afterAll(() => {
  nock.enableNetConnect();
});

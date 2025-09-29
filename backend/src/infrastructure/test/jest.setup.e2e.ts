import 'reflect-metadata';
import nock from 'nock';

beforeAll(() => {
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

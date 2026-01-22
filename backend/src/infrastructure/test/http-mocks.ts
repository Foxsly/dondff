import nock from 'nock';

export function mockSleeperNFLState(overrides?: Partial<any>) {
  const payload = {
    season_type: 'regular',
    season_year: 2025,
    week: 1,
    ...overrides,
  };
  return nock('https://api.sleeper.app').get(/^\/(v1\/)?state\/nfl$/).reply(200, payload);
}

export function mockSleeperPlayers(idsToPlayers: Record<string, any>) {
  return nock('https://api.sleeper.app').get('/v1/players/nfl').reply(200, idsToPlayers);
}

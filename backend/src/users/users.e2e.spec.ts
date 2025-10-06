import type { INestApplication } from '@nestjs/common';
import { createTestApp, closeTestApp } from '@/infrastructure/test/app.factory';
import { getBaseUrl } from '@/infrastructure/test/app.factory';
import { userFactory } from '@/infrastructure/test/factories';
import { IConnection } from '@nestia/fetcher';
import * as Users from '@/infrastructure/test/sdk/functional/users';

describe('Users (e2e) via SDK', () => {
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

  it('POST /users creates a user', async () => {
    const payload = userFactory({ name: 'Amon-Ra St. Brown', email: 'sungod@detroitlions.com' });
    const created = await Users.create(conn, payload);
    expect(created).toEqual(
      expect.objectContaining({
        userId: expect.any(String),
        name: payload.name,
        email: payload.email,
      }),
    );
  });

  it('GET /users returns created users', async () => {
    const seed = userFactory({ name: 'Jared Goff', email: 'qb1@detroitlions.com' });
    await Users.create(conn, seed);

    const list = await Users.findAll(conn);
    expect(Array.isArray(list)).toBe(true);
    expect(list).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: seed.name, email: seed.email }),
      ]),
    );
  });
});
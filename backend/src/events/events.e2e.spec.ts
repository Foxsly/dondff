import request from 'supertest';
import nock from 'nock';
import type { INestApplication } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { DB } from '@/infrastructure/database/types';
import { closeTestApp, createTestApp } from '@/infrastructure/test/app.factory';
import { resetDatabase } from '@/infrastructure/test/factories';
import roundsFixture from '@/external-providers/fifa/__fixtures__/fifa-rounds.test.json';

const SLEEPER_STATE_URL = /\/v1\/state\/nfl$/;
const ESPN_SCOREBOARD = '/apis/site/v2/sports/golf/pga/scoreboard';
const FIFA_ROUNDS_URL = /\/json\/fantasy\/rounds\.json$/;

describe('Event Groups (e2e)', () => {
  let app: INestApplication;
  let db: Kysely<DB>;

  beforeAll(async () => {
    app = await createTestApp();
    db = (app as any).__db__ as Kysely<DB>;
  });

  afterEach(async () => {
    await resetDatabase(app);
    nock.cleanAll();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  const mockNflState = (overrides: Partial<{ week: number; season: string }> = {}) => {
    nock('https://api.sleeper.app').get(SLEEPER_STATE_URL).reply(200, {
      week: 1,
      season: '2025',
      season_type: 'regular',
      ...overrides,
    });
  };

  const dateStr = (offsetDays: number) =>
    new Date(Date.now() + offsetDays * 24 * 3600 * 1000).toISOString().slice(0, 10);

  const isoDay = (d: string | Date) => new Date(d).toISOString().slice(0, 10);

  const mockNflScores = (dates: string[]) => {
    nock('https://sleeper.com')
      .post('/graphql')
      .reply(200, {
        data: {
          scores: dates.map((date) => ({ date, status: 'pre_game' })),
        },
      });
  };

  describe('NFL', () => {
    const WEEK_1_DATES = [dateStr(7), dateStr(8), dateStr(9)];
    const WEEK_2_DATES = [dateStr(14), dateStr(15), dateStr(16)];

    it('creates an event group with seasonYear from Sleeper state and real week dates', async () => {
      mockNflState();
      mockNflScores(WEEK_1_DATES);

      const res = await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toContainEqual(
        expect.objectContaining({
          name: 'NFL Week 1',
          sportLeague: 'NFL',
          seasonYear: 2025,
        }),
      );

      const events = await db
        .selectFrom('event')
        .selectAll()
        .where('externalEventId', '=', '2025-1')
        .where('externalEventSource', '=', 'SLEEPER')
        .execute();
      expect(events).toHaveLength(1);
      expect(isoDay(events[0].startDate)).toBe(dateStr(7));
      expect(isoDay(events[0].endDate)).toBe(dateStr(9));

      // with-dates triggers a re-sync, so re-arm the Sleeper mocks
      mockNflState();
      mockNflScores(WEEK_1_DATES);
      const withDates = await request(app.getHttpServer())
        .get('/event-groups/NFL/with-dates')
        .expect(200);
      const weekOne = withDates.body.find((g: any) => g.name === 'NFL Week 1');
      expect(isoDay(weekOne.startDate)).toBe(dateStr(7));
      expect(isoDay(weekOne.endDate)).toBe(dateStr(9));
      expect(weekOne.status).toBe('PENDING');
    });

    it('re-sync is idempotent and preserves the group id and seasonYear', async () => {
      mockNflState();
      mockNflScores(WEEK_1_DATES);
      const first = await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);
      const firstGroup = first.body.find((g: any) => g.name === 'NFL Week 1');

      mockNflState();
      mockNflScores(WEEK_1_DATES);
      const second = await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);
      const secondGroup = second.body.find((g: any) => g.name === 'NFL Week 1');

      expect(secondGroup.eventGroupId).toBe(firstGroup.eventGroupId);
      expect(secondGroup.seasonYear).toBe(2025);

      const groups = await db
        .selectFrom('eventGroup')
        .selectAll()
        .where('name', '=', 'NFL Week 1')
        .execute();
      expect(groups).toHaveLength(1);

      const events = await db
        .selectFrom('event')
        .selectAll()
        .where('externalEventId', '=', '2025-1')
        .where('externalEventSource', '=', 'SLEEPER')
        .execute();
      expect(events).toHaveLength(1);
      expect(isoDay(events[0].startDate)).toBe(dateStr(7));
      expect(isoDay(events[0].endDate)).toBe(dateStr(9));
    });

    it('tags each week of the same season with the same seasonYear', async () => {
      mockNflState({ week: 1 });
      mockNflScores(WEEK_1_DATES);
      await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);

      mockNflState({ week: 2 });
      mockNflScores(WEEK_2_DATES);
      await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);

      mockNflState({ week: 2 });
      mockNflScores(WEEK_2_DATES);
      const res = await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);

      expect(res.body.map((g: any) => g.name).sort()).toEqual(['NFL Week 1', 'NFL Week 2']);
      for (const g of res.body) {
        expect(g.seasonYear).toBe(2025);
      }
    });

    it('skips the event and group entirely when the week has no game dates', async () => {
      mockNflState();
      mockNflScores([]);

      const res = await request(app.getHttpServer()).get('/event-groups/NFL').expect(200);

      expect(res.body).toEqual([]);
    });
  });

  describe('GOLF', () => {
    const currentYear = new Date().getFullYear();

    it('creates an event group with seasonYear from matched FanDuel + ESPN data', async () => {
      nock('https://fdresearch-api.fanduel.com')
        .post('/graphql')
        .reply(200, {
          data: {
            getGolfEvents: [
              { id: 'fd-scottish-open', name: 'Genesis Scottish Open' },
              { id: 'fd-masters', name: 'The Masters' },
            ],
          },
        });

      nock('https://site.api.espn.com')
        .get(ESPN_SCOREBOARD)
        .query({ dates: String(currentYear) })
        .reply(200, {
          events: [
            {
              name: 'Genesis Scottish Open',
              date: `${currentYear}-07-10`,
              endDate: `${currentYear}-07-13`,
              status: { type: { state: 'pre' } },
            },
          ],
        });

      const res = await request(app.getHttpServer()).get('/event-groups/GOLF').expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toEqual(
        expect.objectContaining({
          name: 'Genesis Scottish Open',
          sportLeague: 'GOLF',
          seasonYear: currentYear,
        }),
      );
    });
  });

  describe('WORLDCUP', () => {
    it('derives seasonYear from FIFA match dates', async () => {
      nock('https://play.fifa.com').get(FIFA_ROUNDS_URL).reply(200, roundsFixture as any);

      const res = await request(app.getHttpServer()).get('/event-groups/WORLDCUP').expect(200);

      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body).toContainEqual(
        expect.objectContaining({
          name: 'World Cup Group Stage – Matchday 1',
          sportLeague: 'WORLDCUP',
          seasonYear: 2026,
        }),
      );
      for (const g of res.body) {
        expect(g.seasonYear).toBe(2026);
      }
    });
  });

  describe('NEGATIVE', () => {
    it('returns an error for an unsupported sport league', async () => {
      const res = await request(app.getHttpServer()).get('/event-groups/NBA').expect(500);

      expect(res.body.statusCode).toBe(500);
    });
  });
});
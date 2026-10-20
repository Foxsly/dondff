import request from 'supertest';
import nock from 'nock';
import { randomUUID } from 'crypto';
import type { INestApplication } from '@nestjs/common';
import type { Kysely } from 'kysely';
import type { DB } from '@/infrastructure/database/types';
import { closeTestApp, createTestApp } from '@/infrastructure/test/app.factory';
import { resetDatabase } from '@/infrastructure/test/factories';
import { TeamsEntryRepository } from '@/teams/teams-entry.repository';

const SLEEPER = 'https://api.sleeper.app';
const WEEK_NAME = 'NBA 2025-26 Week 10';

/** A raw Sleeper NBA week row, shaped as the API returns it. */
const sleeperRow = (
  playerId: string,
  name: string,
  positions: string[],
  date: string,
  opponent: string,
  stats: Record<string, number>,
) => {
  const [first_name, last_name] = name.split(' ');
  return {
    status: null,
    date,
    stats,
    category: 'stat',
    week: 10,
    season: '2025',
    season_type: 'regular',
    sport: 'nba',
    company: 'sportradar',
    player_id: playerId,
    player: {
      first_name,
      last_name,
      fantasy_positions: positions,
      position: positions[0],
      injury_status: null,
      metadata: { channel_id: '1' },
    },
    team: 'DET',
    opponent,
    game_id: `${playerId}-${date}`,
  };
};

/** A raw Sleeper schedule row; completed games also carry box-score fields. */
const sleeperGame = (
  gameId: string,
  week: number,
  date: string,
  away: string,
  home: string,
  status = 'pre_game',
) => ({
  status,
  date,
  home: { team: home, record: '10-5' },
  week,
  game_id: gameId,
  away: { team: away, record: '7-8' },
});

describe('NBA (e2e)', () => {
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

  const createEventGroup = async (name: string, dates: string[]) => {
    const group = await request(app.getHttpServer())
      .post('/event-groups')
      .send({ name, sportLeague: 'NBA', seasonYear: 2025 })
      .expect(201);
    for (const [i, date] of dates.entries()) {
      await request(app.getHttpServer())
        .post('/events')
        .send({
          eventGroupId: group.body.eventGroupId,
          name: 'DET @ BOS',
          startDate: date,
          endDate: date,
          externalEventId: `${name}-${i}`,
          externalEventSource: 'SLEEPER',
        })
        .expect(201);
    }
    return group.body as { eventGroupId: string };
  };

  const createNbaTeam = async (eventGroupId: string) => {
    const user = await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Hoops Fan', email: `hoops.${Date.now()}@example.com` })
      .expect(201);
    const league = await request(app.getHttpServer())
      .post('/leagues')
      .send({ name: 'Hoops League', sportLeague: 'NBA' })
      .expect(201);
    const team = await request(app.getHttpServer())
      .post('/teams')
      .send({
        leagueId: league.body.leagueId,
        userId: user.body.userId,
        seasonYear: 2025,
        eventGroupId,
      })
      .expect(201);
    return { leagueId: league.body.leagueId as string, teamId: team.body.teamId as string };
  };

  const draft = (teamId: string, position: string, playerId: string, playerName: string) =>
    request(app.getHttpServer())
      .put(`/teams/${teamId}/players`)
      .send({ teamId, position, playerId, playerName })
      .expect(200);

  describe('GET /event-groups/NBA', () => {
    it('creates a group per Sleeper week with one event per game, skipping canceled games', async () => {
      nock(SLEEPER)
        .get('/v1/state/nba')
        .reply(200, {
          week: 10,
          leg: 10,
          display_week: 10,
          season: '2025',
          league_season: '2025',
          season_type: 'regular',
        });
      nock('https://api.sleeper.com')
        .get('/schedule/nba/regular/2025')
        .reply(200, [
          sleeperGame('g0', 9, '2025-12-21', 'LAL', 'GSW', 'complete'),
          sleeperGame('g1', 10, '2025-12-22', 'DET', 'BOS'),
          sleeperGame('g2', 10, '2025-12-28', 'CLE', 'NYK'),
          sleeperGame('gx', 10, '2025-12-27', 'STR', 'STP', 'canceled'),
          sleeperGame('g12', 12, '2026-01-05', 'PHX', 'DEN'),
        ]);

      const res = await request(app.getHttpServer()).get('/event-groups/NBA').expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({ name: WEEK_NAME, sportLeague: 'NBA', seasonYear: 2025 }),
      ]);
      const events = await db
        .selectFrom('event')
        .select(['name', 'externalEventId', 'externalEventSource'])
        .where('eventGroupId', '=', res.body[0].eventGroupId)
        .orderBy('externalEventId')
        .execute();
      expect(events).toEqual([
        { name: 'DET @ BOS', externalEventId: 'g1', externalEventSource: 'SLEEPER' },
        { name: 'CLE @ NYK', externalEventId: 'g2', externalEventSource: 'SLEEPER' },
      ]);
    });

    it('returns the error contract when Sleeper is unavailable', async () => {
      nock(SLEEPER).get('/v1/state/nba').reply(503);

      const res = await request(app.getHttpServer()).get('/event-groups/NBA').expect(500);

      expect(res.body.statusCode).toBe(500);
    });

    it('returns the error contract and creates nothing when the schedule is malformed', async () => {
      nock(SLEEPER).get('/v1/state/nba').reply(200, {
        week: 10,
        leg: 10,
        display_week: 10,
        season: '2025',
        league_season: '2025',
        season_type: 'regular',
      });
      nock('https://api.sleeper.com')
        .get('/schedule/nba/regular/2025')
        .reply(200, [{ game_id: 'g1', date: '2025-12-22', status: 'pre_game' }]);

      const res = await request(app.getHttpServer()).get('/event-groups/NBA').expect(500);

      expect(res.body.statusCode).toBe(500);
      expect(await db.selectFrom('eventGroup').selectAll().execute()).toEqual([]);
    });
  });

  describe('league defaults', () => {
    it('gives a new NBA league G/F/C positions', async () => {
      const league = await request(app.getHttpServer())
        .post('/leagues')
        .send({ name: 'Hoops League', sportLeague: 'NBA' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/leagues/${league.body.leagueId}/positions`)
        .expect(200);

      expect(res.body.map((p: any) => [p.position, p.poolSize])).toEqual(
        expect.arrayContaining([
          ['G', 64],
          ['F', 64],
          ['C', 32],
        ]),
      );
      expect(res.body).toHaveLength(3);
    });
  });

  describe('projections', () => {
    const mockProjections = () =>
      nock(SLEEPER)
        .persist()
        .get('/projections/nba/2025/10')
        .query({ season_type: 'regular' })
        .reply(200, [
          sleeperRow('wing', 'Ausar Thompson', ['SF', 'SG'], '2025-12-22', 'BOS', {
            pts: 20,
            reb: 6,
          }), // 16
          sleeperRow('wing', 'Ausar Thompson', ['SF', 'SG'], '2025-12-26', 'MIA', {
            pts: 30,
            reb: 6,
          }), // 21
          sleeperRow('big', 'Jalen Duren', ['C', 'PF'], '2025-12-22', 'BOS', { pts: 12, reb: 12 }), // 18
          sleeperRow('pf', 'Tobias Harris', ['PF'], '2025-12-22', 'BOS', { pts: 16, reb: 5 }), // 13
          sleeperRow('out', 'Injured Player', ['PF'], '2025-12-22', 'BOS', {}),
        ]);

    it("returns each eligible player's best projected game", async () => {
      const group = await createEventGroup(WEEK_NAME, ['2025-12-22', '2025-12-28']);
      mockProjections();

      const res = await request(app.getHttpServer())
        .get(`/players/projections/2025/${group.eventGroupId}/F`)
        .query({ sportLeague: 'NBA' })
        .expect(200);

      expect(res.body).toEqual([
        expect.objectContaining({
          playerId: 'wing',
          position: 'F',
          projectedPoints: 21,
          oppTeam: 'BOS, MIA',
        }),
        expect.objectContaining({ playerId: 'pf', position: 'F', projectedPoints: 13 }),
      ]);
    });

    it("pools players by primary position only, not every fantasy position they're eligible for", async () => {
      const group = await createEventGroup(WEEK_NAME, ['2025-12-22', '2025-12-28']);
      mockProjections();

      const pool = async (position: string) =>
        (
          await request(app.getHttpServer())
            .get(`/players/projections/2025/${group.eventGroupId}/${position}`)
            .query({ sportLeague: 'NBA' })
            .expect(200)
        ).body.map((p: any) => p.playerId);

      // The SF/SG wing is not a G, and the C/PF big is not an F
      expect(await pool('G')).toEqual([]);
      expect(await pool('C')).toEqual(['big']);
    });

    it('rejects an NBA event group that is not a Sleeper week', async () => {
      const group = await createEventGroup('Some Custom Group', ['2025-12-22']);

      const res = await request(app.getHttpServer())
        .get(`/players/projections/2025/${group.eventGroupId}/F`)
        .query({ sportLeague: 'NBA' })
        .expect(500);

      expect(res.body.statusCode).toBe(500);
    });

    it('keeps a player drafted at another slot off the board', async () => {
      const group = await createEventGroup(WEEK_NAME, ['2025-12-22', '2025-12-28']);
      mockProjections();
      const { teamId } = await createNbaTeam(group.eventGroupId);
      await draft(teamId, 'G', 'wing', 'Ausar Thompson');

      const res = await request(app.getHttpServer())
        .get(`/teams/${teamId}/cases`)
        .query({ position: 'F' })
        .expect(200);

      expect(res.body.position).toBe('F');
      expect(res.body.players.map((p: any) => p.playerId).sort()).toEqual(['pf']);
      expect(res.body.boxes).toHaveLength(1);
      // The board never reveals which player is in which case
      for (const box of res.body.boxes) {
        expect(box).not.toHaveProperty('playerId');
      }
    });
  });

  describe('one player per team', () => {
    // Pools are by primary position, so a player normally sits on one board only.
    // The wing (primary SF) is on the F board; drafting them at G as well stands in
    // for Sleeper changing their primary position after one slot was filled.
    const openForwardBoard = async () => {
      const group = await createEventGroup(WEEK_NAME, ['2025-12-22', '2025-12-28']);
      nock(SLEEPER)
        .persist()
        .get('/projections/nba/2025/10')
        .query({ season_type: 'regular' })
        .reply(200, [
          sleeperRow('wing', 'Ausar Thompson', ['SF', 'SG'], '2025-12-22', 'BOS', { pts: 20 }),
          sleeperRow('sf', 'Small Forward', ['SF'], '2025-12-22', 'BOS', { pts: 14 }),
          sleeperRow('big', 'Jalen Duren', ['C', 'PF'], '2025-12-22', 'BOS', { pts: 12 }),
          sleeperRow('pf', 'Tobias Harris', ['PF'], '2025-12-22', 'BOS', { pts: 16 }),
        ]);
      const { teamId } = await createNbaTeam(group.eventGroupId);
      const board = await request(app.getHttpServer())
        .get(`/teams/${teamId}/cases`)
        .query({ position: 'F' })
        .expect(200);
      expect(board.body.players.map((p: any) => p.playerId).sort()).toEqual(['pf', 'sf', 'wing']);
      return teamId;
    };

    const lineup = async (teamId: string) => {
      const team = await request(app.getHttpServer()).get(`/teams/${teamId}`).expect(200);
      return Object.fromEntries(team.body.players.map((p: any) => [p.position, p.playerId]));
    };

    it('rejects assigning a player already filling another slot with 409', async () => {
      const teamId = await openForwardBoard();
      await draft(teamId, 'G', 'wing', 'Ausar Thompson');

      const res = await request(app.getHttpServer())
        .put(`/teams/${teamId}/players`)
        .send({ teamId, position: 'F', playerId: 'wing', playerName: 'Ausar Thompson' })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(await lineup(teamId)).toEqual({ G: 'wing' });
    });

    it('rejects keeping a case holding an already-drafted player, leaving the board as it was', async () => {
      const teamId = await openForwardBoard();
      await draft(teamId, 'G', 'wing', 'Ausar Thompson');

      // Put the F board in its endgame: the wing's case selected, one other case left.
      const entry = await db
        .selectFrom('teamEntry')
        .selectAll()
        .where('teamId', '=', teamId)
        .where('position', '=', 'F')
        .executeTakeFirstOrThrow();
      const audits = await db
        .selectFrom('teamEntryAudit')
        .selectAll()
        .where('teamEntryId', '=', entry.teamEntryId)
        .orderBy('boxNumber')
        .execute();
      const wingBox = audits.find((a) => a.playerId === 'wing')!;
      const [eliminated] = audits.filter((a) => a.playerId !== 'wing');
      await db
        .updateTable('teamEntryAudit')
        .set({ boxStatus: 'selected' })
        .where('auditId', '=', wingBox.auditId)
        .execute();
      await db
        .updateTable('teamEntryAudit')
        .set({ boxStatus: 'eliminated' })
        .where('auditId', '=', eliminated.auditId)
        .execute();
      await db
        .updateTable('teamEntry')
        .set({ selectedBox: wingBox.boxNumber, status: 'playing' })
        .where('teamEntryId', '=', entry.teamEntryId)
        .execute();

      await request(app.getHttpServer())
        .post(`/teams/${teamId}/offers`)
        .send({ position: 'F', decision: 'keep' })
        .expect(409);

      expect(await lineup(teamId)).toEqual({ G: 'wing' });
      const after = await db
        .selectFrom('teamEntryAudit')
        .select(['playerId', 'boxStatus'])
        .where('teamEntryId', '=', entry.teamEntryId)
        .execute();
      expect(after.filter((a) => a.boxStatus === 'available')).toHaveLength(1);
      const entryAfter = await db
        .selectFrom('teamEntry')
        .select('status')
        .where('teamEntryId', '=', entry.teamEntryId)
        .executeTakeFirstOrThrow();
      expect(entryAfter.status).toBe('playing');
    });

    const pendingOffer = async (
      teamId: string,
      position: string,
      playerId: string,
      playerName: string,
    ) => {
      const entry = await db
        .selectFrom('teamEntry')
        .selectAll()
        .where('teamId', '=', teamId)
        .where('position', '=', position)
        .executeTakeFirstOrThrow();
      const offerId = randomUUID();
      await db
        .insertInto('teamEntryOffer')
        .values({
          offerId,
          teamEntryId: entry.teamEntryId,
          playerId,
          playerName,
          projectedPoints: 10,
          injuryStatus: null,
          status: 'pending',
        } as any)
        .execute();
      return { offerId, teamEntryId: entry.teamEntryId };
    };

    const offerStatus = async (offerId: string) =>
      (
        await db
          .selectFrom('teamEntryOffer')
          .select('status')
          .where('offerId', '=', offerId)
          .executeTakeFirstOrThrow()
      ).status;

    it('accepting an offer for an already-drafted player leaves the offer pending and the entry open', async () => {
      const teamId = await openForwardBoard();
      await draft(teamId, 'G', 'wing', 'Ausar Thompson');
      const { offerId, teamEntryId } = await pendingOffer(teamId, 'F', 'wing', 'Ausar Thompson');

      await request(app.getHttpServer())
        .post(`/teams/${teamId}/offers/accept`)
        .send({ position: 'F' })
        .expect(409);

      expect(await offerStatus(offerId)).toBe('pending');
      expect(await lineup(teamId)).toEqual({ G: 'wing' });
      const entry = await db
        .selectFrom('teamEntry')
        .select('status')
        .where('teamEntryId', '=', teamEntryId)
        .executeTakeFirstOrThrow();
      expect(entry.status).not.toBe('finished');
    });

    it('accepts an offer only once when accept is sent twice at the same time', async () => {
      const teamId = await openForwardBoard();
      const { offerId } = await pendingOffer(teamId, 'F', 'pf', 'Tobias Harris');

      const results = await Promise.all(
        [1, 2].map(() =>
          request(app.getHttpServer())
            .post(`/teams/${teamId}/offers/accept`)
            .send({ position: 'F' }),
        ),
      );

      const statuses = results.map((r) => r.status);
      expect(statuses.filter((code) => code === 201)).toHaveLength(1);
      expect(
        statuses.filter((code) => code !== 201).every((code) => [404, 409].includes(code)),
      ).toBe(true);
      expect(await offerStatus(offerId)).toBe('accepted');
      expect(await lineup(teamId)).toEqual({ F: 'pf' });
    });

    it('cannot accept an offer that a reject already moved on, even holding a stale read', async () => {
      // The interleaving PGlite cannot produce over HTTP: accept read the offer as
      // pending, then a reject rejected it and created a replacement.
      const teamId = await openForwardBoard();
      const stale = await pendingOffer(teamId, 'F', 'pf', 'Tobias Harris');
      await db
        .updateTable('teamEntryOffer')
        .set({ status: 'rejected' })
        .where('offerId', '=', stale.offerId)
        .execute();
      const replacement = await pendingOffer(teamId, 'F', 'sf', 'Small Forward');
      const offers = app.get(TeamsEntryRepository);

      expect(await offers.updateOfferStatus(stale.offerId, 'accepted')).toBeNull();
      expect(await offerStatus(stale.offerId)).toBe('rejected');
      expect(await offerStatus(replacement.offerId)).toBe('pending');
    });

    it('lets only one of two simultaneous assignments of the same player through', async () => {
      const teamId = await openForwardBoard();

      const results = await Promise.all(
        ['G', 'F'].map((position) =>
          request(app.getHttpServer())
            .put(`/teams/${teamId}/players`)
            .send({ teamId, position, playerId: 'wing', playerName: 'Ausar Thompson' }),
        ),
      );

      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(Object.values(await lineup(teamId))).toEqual(['wing']);
    });
  });

  describe('scoring', () => {
    it("scores each drafted player's best game of the finished week", async () => {
      const group = await createEventGroup(WEEK_NAME, ['2025-12-22', '2025-12-28']);
      const { leagueId, teamId } = await createNbaTeam(group.eventGroupId);
      await draft(teamId, 'G', 'cade', 'Cade Cunningham');
      await draft(teamId, 'F', 'wing', 'Ausar Thompson');
      await draft(teamId, 'C', 'dnp', 'Bench Center');
      nock(SLEEPER)
        .persist()
        .get('/stats/nba/2025/10')
        .query({ season_type: 'regular' })
        .reply(200, [
          sleeperRow('cade', 'Cade Cunningham', ['PG'], '2025-12-22', 'BOS', { pts_std: 12 }),
          sleeperRow('cade', 'Cade Cunningham', ['PG'], '2025-12-23', 'MIA', { pts_std: 22 }),
          sleeperRow('cade', 'Cade Cunningham', ['PG'], '2025-12-26', 'NYK', { pts_std: 14 }),
          sleeperRow('cade', 'Cade Cunningham', ['PG'], '2025-12-28', 'CHI', { pts_std: 31 }),
          sleeperRow('wing', 'Ausar Thompson', ['SF', 'SG'], '2025-12-22', 'BOS', {
            pts_std: 18.5,
          }),
          sleeperRow('dnp', 'Bench Center', ['C'], '2025-12-22', 'BOS', {}),
          sleeperRow('DET', 'Detroit Pistons', ['TEAM'], '2025-12-22', 'BOS', { pts_std: 150 }),
        ]);

      const res = await request(app.getHttpServer())
        .get(`/leagues/${leagueId}/teams`)
        .query({ eventGroupId: group.eventGroupId })
        .expect(200);

      const actual = Object.fromEntries(
        res.body[0].players.map((p: any) => [p.position, p.actualPoints]),
      );
      expect(actual).toEqual({ G: 31, F: 18.5, C: 0 });
    });
  });
});

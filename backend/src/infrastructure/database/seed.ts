import { SportLeague } from '@/common/types/sport-league.type';

/**
 * Dev seed — idempotent, safe to re-run.
 *
 * Creates:
 *   - 3 users  (dev@dond.com as admin, player2@dond.com, player3@dond.com)
 *   - 1 NFL league (Dev League 2025) with RB + WR positions
 *   - 1 Golf league (Dev LEAGUE Masters) with 3 GOLF_PLAYER positions
 *   - 3 league members in each league
 *   - Teams for all 3 users × weeks 1–18 of season 2025 (NFL, empty lineups)
 *   - 1 event group (The Masters) for the golf league
 *
 * Usage:
 *   npm run seed
 */
import 'dotenv/config';
import { createDb } from './database';

// Fixed UUIDs so the script is idempotent
const LEAGUE_ID          = '10000000-0000-0000-0000-000000000001';
const LEAGUE_SETTINGS_ID = '10000000-0000-0000-0000-000000000002';
const ADMIN_ID           = '10000000-0000-0000-0000-000000000010';
const PLAYER2_ID         = '10000000-0000-0000-0000-000000000011';
const PLAYER3_ID         = '10000000-0000-0000-0000-000000000012';

// Golf league
const GOLF_LEAGUE_ID          = '10000000-0000-0000-0000-000000000003';
const GOLF_LEAGUE_SETTINGS_ID = '10000000-0000-0000-0000-000000000004';
const GOLF_EVENT_GROUP_ID     = '10000000-0000-0000-0000-000000000005';

const SEASON_YEAR = 2025;
// Skip the current dev week so the game flow creates that team properly via POST /teams
// (which generates entries and cases). All other weeks are seeded for display purposes only.
const DEV_WEEK = process.env.DEV_WEEK ? Number(process.env.DEV_WEEK) : null;
const WEEKS = Array.from({ length: 18 }, (_, i) => i + 1).filter((w) => w !== DEV_WEEK); // 1–18 minus dev week
const USERS = [
  { userId: ADMIN_ID,   email: 'dev@dond.com',     name: 'Dev Admin'   },
  { userId: PLAYER2_ID, email: 'player2@dond.com', name: 'Player Two'  },
  { userId: PLAYER3_ID, email: 'player3@dond.com', name: 'Player Three'},
];

async function seed() {
  const db = createDb();

  try {
    // Users
    await db
      .insertInto('dondUser')
      .values(USERS)
      .onConflict((oc) => oc.column('userId').doNothing())
      .execute();
    console.log('  users ok');

    // League
    await db
      .insertInto('league')
      .values({
        leagueId: LEAGUE_ID,
        name: 'Dev League 2025',
        sportLeague: SportLeague.NFL,
      })
      .onConflict((oc) => oc.column('leagueId').doNothing())
      .execute();
    console.log('  league ok');

    // League settings
    await db
      .insertInto('leagueSettings')
      .values({
        leagueSettingsId: LEAGUE_SETTINGS_ID,
        leagueId: LEAGUE_ID,
        scoringType: 'PPR',
      })
      .onConflict((oc) => oc.column('leagueSettingsId').doNothing())
      .execute();
    console.log('  league settings ok');

    // League settings positions
    await db
      .insertInto('leagueSettingsPosition')
      .values([
        { leagueSettingsId: LEAGUE_SETTINGS_ID, position: 'RB', poolSize: 64 },
        { leagueSettingsId: LEAGUE_SETTINGS_ID, position: 'WR', poolSize: 96 },
      ])
      .onConflict((oc) => oc.columns(['leagueSettingsId', 'position']).doNothing())
      .execute();
    console.log('  positions ok');

    // League members
    await db
      .insertInto('leagueUser')
      .values([
        { leagueId: LEAGUE_ID, userId: ADMIN_ID,   role: 'admin'  },
        { leagueId: LEAGUE_ID, userId: PLAYER2_ID, role: 'player' },
        { leagueId: LEAGUE_ID, userId: PLAYER3_ID, role: 'player' },
      ])
      .onConflict((oc) => oc.columns(['leagueId', 'userId']).doNothing())
      .execute();
    console.log('  league members ok');

    // Teams — only insert if none exist yet for this league+season
    // (prevents duplicates on re-run without losing any game data the user played)
    const existing = await db
      .selectFrom('team')
      .select('teamId')
      .where('leagueId', '=', LEAGUE_ID)
      .where('seasonYear', '=', SEASON_YEAR)
      .executeTakeFirst();

    if (existing) {
      console.log('  teams already seeded — skipping');
    } else {
      // Create event groups for each week first
      const eventGroupIds: Record<number, string> = {};
      for (const week of WEEKS) {
        const eventGroupId = crypto.randomUUID() as string;
        eventGroupIds[week] = eventGroupId;
        await db
          .insertInto('eventGroup')
          .values({
            eventGroupId: eventGroupId,
            name: `NFL Week ${week}`,
            sportLeague: SportLeague.NFL,
          })
          .execute();
      }

      const teamRows = USERS.flatMap(({ userId }) =>
        WEEKS.map((week) => ({
          teamId: crypto.randomUUID() as string,
          leagueId: LEAGUE_ID,
          userId,
          seasonYear: SEASON_YEAR,
          eventGroupId: eventGroupIds[week],
        })),
      );
      await db.insertInto('team').values(teamRows).execute();
      console.log(`  teams ok (${teamRows.length} rows)`);
    }

    // ── Golf League: Dev LEAGUE Masters ──────────────────────────────
    await db
      .insertInto('league')
      .values({
        leagueId: GOLF_LEAGUE_ID,
        name: 'Dev LEAGUE Masters',
        sportLeague: SportLeague.GOLF,
      })
      .onConflict((oc) => oc.column('leagueId').doNothing())
      .execute();
    console.log('  golf league ok');

    await db
      .insertInto('leagueSettings')
      .values({
        leagueSettingsId: GOLF_LEAGUE_SETTINGS_ID,
        leagueId: GOLF_LEAGUE_ID,
        scoringType: 'PPR',
      })
      .onConflict((oc) => oc.column('leagueSettingsId').doNothing())
      .execute();
    console.log('  golf league settings ok');

    await db
      .insertInto('leagueSettingsPosition')
      .values([
        { leagueSettingsId: GOLF_LEAGUE_SETTINGS_ID, position: 'GOLF_PLAYER_1', poolSize: 150 },
        { leagueSettingsId: GOLF_LEAGUE_SETTINGS_ID, position: 'GOLF_PLAYER_2', poolSize: 150 },
        { leagueSettingsId: GOLF_LEAGUE_SETTINGS_ID, position: 'GOLF_PLAYER_3', poolSize: 150 },
      ])
      .onConflict((oc) => oc.columns(['leagueSettingsId', 'position']).doNothing())
      .execute();
    console.log('  golf positions ok');

    await db
      .insertInto('leagueUser')
      .values([
        { leagueId: GOLF_LEAGUE_ID, userId: ADMIN_ID,   role: 'admin'  },
        { leagueId: GOLF_LEAGUE_ID, userId: PLAYER2_ID, role: 'player' },
        { leagueId: GOLF_LEAGUE_ID, userId: PLAYER3_ID, role: 'player' },
      ])
      .onConflict((oc) => oc.columns(['leagueId', 'userId']).doNothing())
      .execute();
    console.log('  golf league members ok');

    // Event group for the Masters
    await db
      .insertInto('eventGroup')
      .values({
        eventGroupId: GOLF_EVENT_GROUP_ID,
        name: 'The Masters',
        sportLeague: SportLeague.GOLF,
      })
      .onConflict((oc) => oc.column('eventGroupId').doNothing())
      .execute();
    console.log('  golf event group ok');

    console.log('\nSeed complete.');
    console.log(`NFL League ID : ${LEAGUE_ID}`);
    console.log(`NFL League URL: http://localhost:3000/league/${LEAGUE_ID}`);
    console.log(`Golf League ID : ${GOLF_LEAGUE_ID}`);
    console.log(`Golf League URL: http://localhost:3000/league/${GOLF_LEAGUE_ID}`);
    console.log('Credentials:');
    console.log('  dev@dond.com      (admin)');
    console.log('  player2@dond.com  (player)');
    console.log('  player3@dond.com  (player)');
  } finally {
    await (db as any).destroy?.();
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});

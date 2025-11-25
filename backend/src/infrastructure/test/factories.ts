import * as Users from '../test/sdk/functional/users';
import * as Leagues from '../test/sdk/functional/leagues';
import * as Teams from '../test/sdk/functional/teams';
// Lightweight factories/builders for E2E tests (no extra deps)
// Keep IDs deterministic enough for assertions but unique per test run
const unique = () => Math.random().toString(36).slice(2, 8);

import { CreateLeagueSettingsDto } from '@/leagues/entities/league-settings.entity';
import { CreateUserDto } from '@/users/entities/user.entity';
import { CreateLeagueDto } from '@/leagues/entities/league.entity';
import { CreateTeamDto } from '@/teams/entities/team.entity';
import { CreateTeamPlayerDto } from '@/teams/entities/team-player.entity';

export const leagueFactory = (overrides: Partial<CreateLeagueDto> = {}): CreateLeagueDto => ({
  name: overrides.name ?? `Test League ${unique()}`,
});

export const userFactory = (overrides: Partial<CreateUserDto> = {}): CreateUserDto => {
  const suffix = unique();
  return {
    name: overrides.name ?? `Test User ${suffix}`,
    email: overrides.email ?? `user.${suffix}@example.com`,
  };
};

export const leagueSettingsFactory = (
  overrides: Partial<CreateLeagueSettingsDto> = {},
): CreateLeagueSettingsDto => ({
  leagueId: overrides.leagueId ?? crypto.randomUUID(),
  scoringType: overrides.scoringType ?? 'PPR',
  positions: overrides.positions ?? ['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'],
  rbPoolSize: overrides.rbPoolSize ?? 24,
  wrPoolSize: overrides.wrPoolSize ?? 36,
  qbPoolSize: overrides.qbPoolSize ?? 12,
  tePoolSize: overrides.tePoolSize ?? 12,
});

export const teamFactory = (overrides: Partial<CreateTeamDto> = {}): CreateTeamDto => ({
  leagueId: overrides.leagueId ?? crypto.randomUUID(),
  userId: overrides.userId ?? crypto.randomUUID(),
  seasonYear: overrides.seasonYear ?? 2025,
  week: overrides.week ?? 1,
});

export const teamPlayerFactory = (
  overrides: Partial<CreateTeamPlayerDto> = {},
): CreateTeamPlayerDto => ({
  teamId: overrides.teamId ?? crypto.randomUUID(),
  position: overrides.position ?? 'QB',
  playerId: overrides.playerId ?? String(Math.floor(Math.random() * 10000)),
  playerName: overrides.playerName ?? `Player ${Math.random().toString(36).slice(2, 6)}`,
});

export function buildTeamCreateDto(overrides: Partial<CreateTeamDto> = {}): CreateTeamDto {
  return { ...teamFactory(), ...overrides };
}

export function buildTeamUpdateDto(overrides: Partial<CreateTeamDto> = {}): Partial<CreateTeamDto> {
  const now = new Date();
  return {
    week: overrides.week ?? 2,
    seasonYear: overrides.seasonYear ?? now.getFullYear(),
    ...overrides,
  };
}

export async function ensureUser(conn: any, overrides: Partial<CreateUserDto> = {}) {
  const dto = { ...userFactory(), ...overrides };
  const created = await Users.create(conn, dto);
  if (!created?.userId) throw new Error('ensureUser: failed to create user');
  return created;
}

export async function ensureLeague(conn: any, overrides: Partial<CreateLeagueDto> = {}) {
  const dto = { ...leagueFactory(), ...overrides };
  const created = await Leagues.create(conn, dto);
  if (!created?.leagueId) throw new Error('ensureLeague: failed to create league');
  return created;
}

export async function ensureTeamWithFKs(
  conn: any,
  teamOverrides: Partial<CreateTeamDto> = {},
  userOverrides: Partial<CreateUserDto> = {},
  leagueOverrides: Partial<CreateLeagueDto> = {},
) {
  const user = await ensureUser(conn, userOverrides);
  const league = await ensureLeague(conn, leagueOverrides);
  const dto = buildTeamCreateDto({
    userId: user.userId,
    leagueId: league.leagueId,
    ...teamOverrides,
  });
  const created = await Teams.create(conn, dto);
  if (!created?.teamId) throw new Error('ensureTeamWithFKs: failed to create team');
  return { created, dto, user, league };
}

export async function resetDatabase(app: any): Promise<void> {
  const reset = app?.__reset__;
  if (typeof reset === 'function') await reset();
}

/**
 * Thin builder alias for league settings DTOs to mirror other `build*Dto` helpers.
 */
export function buildLeagueSettingsDto(
  overrides: Partial<CreateLeagueSettingsDto> = {},
): CreateLeagueSettingsDto {
  return { ...leagueSettingsFactory(), ...overrides };
}

/**
 * Ensure a league exists and seed an OWNER user membership.
 * Returns `{ league, owner }` where `owner` is the created user entity.
 */
export async function ensureLeagueWithOwner(
  conn: any,
  userOverrides: Partial<CreateUserDto> = {},
  leagueOverrides: Partial<CreateLeagueDto> = {},
): Promise<{ league: any; owner: any }> {
  const league = await ensureLeague(conn, leagueOverrides);
  const owner = await ensureUser(conn, userOverrides);
  await Leagues.users.addLeagueUser(conn, league.leagueId, {
    userId: owner.userId,
    role: 'owner',
  });
  return { league, owner };
}

/**
 * Ensure multiple users exist and are added to a league with specified roles.
 * `specs` example: `[ { overrides: { name: 'A' }, role: 'owner' }, { role: 'member' } ]`
 * Returns `{ leagueId, users: Array<{ user, role }> }`.
 */
export async function ensureLeagueUsers(
  conn: any,
  leagueId: string,
  specs: Array<{ overrides?: Partial<CreateUserDto>; role: 'owner' | 'member' }> = [],
): Promise<{ leagueId: string; users: Array<{ user: any; role: 'owner' | 'member' }> }> {
  const results: Array<{ user: any; role: 'owner' | 'member' }> = [];
  for (const spec of specs) {
    const user = await ensureUser(conn, spec.overrides ?? {});
    await Leagues.users.addLeagueUser(conn, leagueId, {
      userId: user.userId,
      role: spec.role,
    });
    results.push({ user, role: spec.role });
  }
  return { leagueId, users: results };
}

/**
 * Ensure a single league settings version exists for a league.
 * Returns the created settings entity.
 */
export async function ensureLeagueSettingsVersion(
  conn: any,
  leagueId: string,
  overrides: Partial<CreateLeagueSettingsDto> = {},
): Promise<any> {
  const input = buildLeagueSettingsDto({ leagueId, ...overrides });
  const created = await Leagues.settings.createLeagueSettings(conn, leagueId, input as any);
  if (!created?.leagueSettingsId) throw new Error('ensureLeagueSettingsVersion: failed to create');
  return created;
}

/**
 * Upsert a team player for a given team.
 * NOTE: this is a light wrapper; callers should supply required fields in `overrides`.
 * Returns the created/updated TeamPlayer entity.
 */
export async function ensureTeamPlayer(
  conn: any,
  teamId: string,
  overrides: Partial<CreateTeamPlayerDto> = {},
): Promise<any> {
  // If you later add more defaults, seed them via teamPlayerFactory().
  const dto = { ...overrides };
  const created = await Teams.players.upsertTeamPlayer(conn, teamId, dto as any);
  if (!created) throw new Error('ensureTeamPlayer: failed to upsert team player');
  return created;
}

/**
 * Convenience: create two users and add both to a league with roles (owner/member).
 * Returns `{ league, owner, member }`.
 */
export async function ensureLeagueWithOwnerAndMember(
  conn: any,
  leagueOverrides: Partial<CreateLeagueDto> = {},
  ownerOverrides: Partial<CreateUserDto> = {},
  memberOverrides: Partial<CreateUserDto> = {},
): Promise<{ league: any; owner: any; member: any }> {
  const league = await ensureLeague(conn, leagueOverrides);
  const owner = await ensureUser(conn, ownerOverrides);
  const member = await ensureUser(conn, memberOverrides);
  await Leagues.users.addLeagueUser(conn, league.leagueId, { userId: owner.userId, role: 'owner' });
  await Leagues.users.addLeagueUser(conn, league.leagueId, {
    userId: member.userId,
    role: 'member',
  });
  return { league, owner, member };
}

/**
 * Build a minimal, valid DTO for adding a league user, with overrides last.
 * Example: `buildLeagueUserDto({ userId, role: 'member' })`
 */
export function buildLeagueUserDto(
  overrides: Partial<{ userId: string; role: 'owner' | 'member' }> = {},
): any {
  const defaults = { role: 'member' as const };
  return { ...defaults, ...overrides };
}

/**
 * Build a valid payload for updating a league user membership (role change).
 */
export function buildUpdateLeagueUserDto(
  overrides: Partial<{ role: 'owner' | 'member' }> = {},
): any {
  const defaults = { role: 'member' as const };
  return { ...defaults, ...overrides };
}

/**
 * Build a valid set of positions for league settings with uniqueness.
 */
export function buildPositions(
  positions: string[] = ['QB', 'RB', 'WR', 'TE', 'FLEX', 'DST'],
): string[] {
  return Array.from(new Set(positions.map(String)));
}

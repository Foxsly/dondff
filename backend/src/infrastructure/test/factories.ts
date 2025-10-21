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
  playerId: overrides.playerId ?? Math.floor(Math.random() * 10000),
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

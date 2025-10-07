// Lightweight factories/builders for E2E tests (no extra deps)
// Keep IDs deterministic enough for assertions but unique per test run
const unique = () => Math.random().toString(36).slice(2, 8);

import { CreateLeagueSettingsDto } from '@/leagues/entities/league-settings.entity';
import { CreateUserDto } from '@/users/entities/user.entity';

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

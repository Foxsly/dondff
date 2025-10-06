// Lightweight factories/builders for E2E tests (no extra deps)
// Keep IDs deterministic enough for assertions but unique per test run
const unique = () => Math.random().toString(36).slice(2, 8);

export const userFactory = (overrides?: Partial<{ name: string; email: string }>) => {
  const suffix = unique();
  return {
    name: overrides?.name ?? `Test User ${suffix}`,
    email: overrides?.email ?? `user.${suffix}@example.com`,
  };
};

/**
 * Conditional className joiner.
 *
 * Deliberately dependency-free — this is the only thing the UI primitives need
 * from a library like `clsx`, and it is eight lines. Falsy entries are dropped,
 * so variant maps can return `undefined` for the branches that add nothing.
 *
 *   cn('btn', isActive && 'btn-active', className)
 */
export type ClassValue = string | number | null | undefined | false;

export const cn = (...classes: ClassValue[]): string =>
  classes.filter(Boolean).join(' ');

export default cn;

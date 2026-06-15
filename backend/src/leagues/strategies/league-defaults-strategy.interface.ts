export interface ILeagueDefaultsStrategy {
  /**
   * Return the default roster positions and pool sizes for this sport.
   *
   * Each sport defines its own roster structure (e.g. golf: 3 identical
   * GOLF_PLAYER slots; NFL: distinct QB, RB, WR, TE slots). The pool size
   * caps how many players are available for each position — identical slots
   * share the same pool.
   *
   * @returns Array of position configurations. Each entry's `position` is
   *          the roster slot key and `poolSize` is the max players available
   *          for that slot from the total player set.
   */
  getDefaultPositions(): Array<{ position: string; poolSize: number }>;
}

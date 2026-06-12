export interface ILeagueDefaultsStrategy {
  getDefaultPositions(): Array<{ position: string; poolSize: number }>;
}

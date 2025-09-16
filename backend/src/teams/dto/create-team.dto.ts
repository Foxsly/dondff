export class CreateTeamDto {
  constructor(
    public readonly leagueId: number,
    public readonly userId: number,
    public readonly seasonYear: number,
    public readonly week: number,
    public readonly position: string,
    public readonly playerId: number,
    public readonly playerName: string,
  ) {}
}

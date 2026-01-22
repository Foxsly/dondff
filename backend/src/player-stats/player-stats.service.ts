import { FanduelService } from '@/fanduel/fanduel.service';
import {
  IPlayerProjection,
  IPlayerStats,
  PlayerPosition,
  PlayerProjectionResponse,
  PlayerStatResponse,
  PlayerTeams,
} from '@/player-stats/entities/player-stats.entity';
import { SleeperService } from '@/sleeper/sleeper.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerStatsService {
  private playerTeams: Map<string, PlayerTeams> = new Map<string, PlayerTeams>();

  constructor(
    private readonly sleeperService: SleeperService,
    private readonly fanduelService: FanduelService,
  ) {
    this.playerTeams = new Map<string, PlayerTeams>()
  }

  async getPlayerProjections(
    position: string,
    season: number,
    week: number,
  ): Promise<PlayerProjectionResponse> {
    const isPostseason = week > 18;
    //This currently works because the two APIs share a BetGenius ID. If we add more sources, this could become problematic.
    if (isPostseason) {
      const fanduelPlayerProjections = await this.fanduelService.getProjectionsBySport("NFL");
      const rawPlayerProjections: IPlayerProjection[] = fanduelPlayerProjections
        .map((projection) => ({
          playerId: `${projection.player.betGeniusId}`,
          name: projection.player.name,
          position: projection.player.position,
          projectedPoints: projection.fantasy,
          injuryStatus: null,
          oppTeam:
            projection.gameInfo.awayTeam.abbreviation === projection.team.abbreviation
              ? projection.gameInfo.homeTeam.abbreviation
              : projection.gameInfo.awayTeam.abbreviation,
          team: projection.team.abbreviation,
        }));
        //Depending on the week, filter out player (or not)
      let playerProjections: IPlayerProjection[] = [];
      if (week === 20) {
        // RBs: RB > 1.0, TE > 2.0
        // WRs: WR > 1.0
        const positionFilter = position === 'WR' ? [position] : [position, 'TE'];
        playerProjections = rawPlayerProjections
          .filter((projection) => positionFilter.includes(projection.position))
          .filter((projection) =>
            projection.position === 'TE'
              ? projection.projectedPoints >= 2.0
              : projection.projectedPoints >= 1.0,
          );
      } else {
        playerProjections = rawPlayerProjections
          //Need to filter out by position, since the fanduel API doesn't allow us to
          .filter((projection) => projection.position === position)
          //Filter out any 0-score players
          .filter((projection) => projection.projectedPoints > 0.0);
      }
      playerProjections.forEach(this.setPlayerTeamMappings, this);
      return playerProjections;
    } else {
      const sleeperProjections = await this.sleeperService.getPlayerProjections(
        position,
        season,
        week,
      );
      const playerProjections: IPlayerProjection[] = sleeperProjections.map((projection) => ({
        playerId: projection.player.metadata.genius_id,
        name: `${projection.player.first_name} ${projection.player.last_name}`,
        position: this.mapPosition(projection.player.position),
        projectedPoints: projection.stats.pts_ppr,
        injuryStatus: projection.player.injury_status ? projection.player.injury_status : null,
        oppTeam: projection.opponent,
        team: projection.team,
      })) as IPlayerProjection[];
      playerProjections.forEach(this.setPlayerTeamMappings, this);
      return playerProjections;
    }
  }

  async getPlayerStatistics(
    position: string,
    season: number,
    week: number,
  ): Promise<PlayerStatResponse> {
    const isPostseason = week > 18;
    const sleeperStats = await this.sleeperService.getPlayerStatistics(
      position,
      season,
      isPostseason ? week-18 : week,
      //TODO figure out a better way to do this. Sleeper implementation details are leaking into the API doing this
      isPostseason ? 'post' : 'regular');
    return sleeperStats.map((player) => ({
      playerId: player.player.metadata.genius_id,
      name: `${player.player.first_name} ${player.player.last_name}`,
      position: this.mapPosition(player.player.position),
      points: player.stats.pts_ppr,
      injuryStatus: player.player.injury_status ? player.player.injury_status : null,
      oppTeam: player.opponent,
      team: player.team,
    })) as IPlayerStats[];
  }

  getTeamAndOpponentForPlayer(playerId: string): PlayerTeams {
    const matchup = this.playerTeams.get(playerId);
    if(!matchup) {
      return {
        team: 'NA',
        opponent: 'NA'
      };
    }
    return matchup
  }

  private setPlayerTeamMappings(projection: IPlayerProjection) {
    this.playerTeams.set(projection.playerId, {team: projection.team, opponent: projection.oppTeam});
  }

  private mapPosition(position:string): PlayerPosition {
    switch(position) {
      case 'FB':
        return 'RB';
      case 'DEF':
        return 'DST';
      default:
        return position as PlayerPosition;
    }
  }
}

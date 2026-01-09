import { FanduelService } from '@/fanduel/fanduel.service';
import {
  IPlayerProjection,
  IPlayerStats,
  PlayerProjectionResponse,
  PlayerStatResponse,
} from '@/player-stats/entities/player-stats.entity';
import { SleeperService } from '@/sleeper/sleeper.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class PlayerStatsService {
  constructor(
    private readonly sleeperService: SleeperService,
    private readonly fanduelService: FanduelService,
  ) {}

  async getPlayerProjections(
    position: string,
    season: number,
    week: number,
  ): Promise<PlayerProjectionResponse> {
    const sleeperState = await this.sleeperService.getNflState();
    //TODO figure out a better way to do this. This isn't great, because it's ignoring the season/week parameters being passed in. Maybe drive it off week (e.g. week 19 = playoffs week 1)?
    //This currently works because the two APIs share a BetGenius ID. If we add more sources, this could become problematic.
    if (sleeperState.season_type === 'post') {
      const fanduelPlayerProjections = await this.fanduelService.getFanduelProjections();
      //Need to filter out by position, since the fanduel API doesn't allow us to
      const playerProjections: IPlayerProjection[] = fanduelPlayerProjections
        .filter((projection) => projection.player.position === position)
        .map((projection) => ({
          id: `${projection.player.betGeniusId}`,
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
      return playerProjections;
    } else {
      const sleeperProjections = await this.sleeperService.getPlayerProjections(
        position,
        season,
        week,
      );
      const playerProjections: IPlayerProjection[] = sleeperProjections.map((projection) => ({
        id: projection.player.metadata.genius_id,
        name: `${projection.player.first_name} ${projection.player.last_name}`,
        position: projection.player.position,
        projectedPoints: projection.stats.pts_ppr,
        injuryStatus: projection.player.injury_status ? projection.player.injury_status : null,
        oppTeam: projection.opponent,
        team: projection.team,
      })) as IPlayerProjection[];
      return playerProjections;
    }
  }

  async getPlayerStatistics(
    position: string,
    season: number,
    week: number,
  ): Promise<PlayerStatResponse> {
    const sleeperStats = await this.sleeperService.getPlayerStatistics(position, season, week);
    return sleeperStats.map((player) => ({
      id: player.player.metadata.genius_id,
      name: `${player.player.first_name} ${player.player.last_name}`,
      position: player.player.position,
      points: player.stats.pts_ppr,
      injuryStatus: player.player.injury_status ? player.player.injury_status : null,
      oppTeam: player.opponent,
      team: player.team,
    })) as IPlayerStats[];
  }
}

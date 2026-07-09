import { WORLD_CUP_STAGE_NAMES } from '@/world-cup/strategies/world-cup-event-sync.strategy';
import { Injectable } from '@nestjs/common';
import { EventGroup } from '@/events/entities/event-group.entity';
import { IPlayerProjection } from '@/player-stats/entities/player-stats.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { ITeamsGameStrategy } from '@/teams/strategies/teams-game-strategy.interface';

const PER_COUNTRY_QUOTA: Record<string, number> = {
  GK: 1,
  DEF: 3,
  MID: 3,
  FWD: 2,
};

@Injectable()
export class WorldCupTeamsGameStrategy implements ITeamsGameStrategy {
  usesSharedPlayerPool(): boolean {
    return false;
  }

  getExcludedPlayerIds(_team: ITeam, _currentPosition: string): Promise<string[]> {
    return Promise.resolve([]);
  }

  /*
    For WC, we want to override the pool size so that it is dynamic based on the number of teams remaining
   */
  async determinePlayerPool(
    projections: IPlayerProjection[],
    team: ITeam,
    position: string,
    _poolSize: number,
    eventGroup?: EventGroup,
  ): Promise<IPlayerProjection[]> {
    const excluded = await this.getExcludedPlayerIds(team, position);
    const eligible = projections.filter(p => !excluded.includes(p.playerId));

    const quota = PER_COUNTRY_QUOTA[position]!;
    const countries = new Set(eligible.map(p => p.team));
    const sortedPlayerProjections = eligible.sort((a, b) => b.projectedPoints - a.projectedPoints);

    const pool: IPlayerProjection[] = [];
    const takenIds = new Set<string>();

    for (const country of countries) {
      sortedPlayerProjections
        .filter(p => p.team === country)
        .slice(0, quota)
        .forEach((playerProjection) => {
          pool.push(playerProjection);
          takenIds.add(playerProjection.playerId);
        });
    }

    if (!eventGroup) {
      throw new Error('EventGroup is required for World Cup player pool determination');
    }
    const isQuarterfinals = this.isQuarterfinal(eventGroup);

    // Pool size is the per-position quota times the number of countries, plus the next top countries/2 players
    // unless it's for goalkeepers, where we don't add the extra players
    // For quarterfinals, we need to add extra keepers, otherwise the pool is too small to make offers
    const extraFactor = (position === 'GK' && !isQuarterfinals) ? 0 : Math.floor(countries.size / 2);
    const poolSize = Math.floor(countries.size * quota + extraFactor);
    pool.push(...sortedPlayerProjections
      .filter(p => !takenIds.has(p.playerId))
      .slice(0, poolSize - pool.length));
    return pool;
  }

  getNumberOfCases(eventGroup: EventGroup): number {
    if (this.isQuarterfinal(eventGroup)) {
      return 6;
    }
    return 10;
  }

  normalizePlayerName(name: string): string {
    return name;
  }

  private isQuarterfinal(eventGroup: EventGroup): boolean {
    return eventGroup.name.includes(WORLD_CUP_STAGE_NAMES['QF']);
  }
}

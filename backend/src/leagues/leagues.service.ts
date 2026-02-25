import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';
import { AddLeagueUserDto, ILeagueUser, UpdateLeagueUserDto } from './entities/league-user.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';
import {
  CreateLeagueSettingsDto,
  ILeagueSettings,
  ILeagueSettingsPosition,
  ScoringType,
  SportLeague,
} from '@/leagues/entities/league-settings.entity';

const DEFAULT_LEAGUE_SETTINGS = {
  scoringType: 'PPR' as ScoringType,
  sportLeague: 'NFL' as SportLeague,
};
@Injectable()
export class LeaguesService {
  constructor(private readonly leaguesRepository: LeaguesRepository) {}

  async create(createLeagueDto: CreateLeagueDto): Promise<League> {
    let league = await this.leaguesRepository.createLeague(createLeagueDto);
    // Create a default league settings when creating a league
    await this.createLeagueSettings(league.leagueId, {
      ...DEFAULT_LEAGUE_SETTINGS,
      leagueId: league.leagueId,
    });
    return league;
  }

  async findAll(): Promise<League[]> {
    return this.leaguesRepository.findAllLeagues();
  }

  async findOne(id: string): Promise<League> {
    const league = await this.leaguesRepository.findOneLeague(id);
    if (!league) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    const updated = await this.leaguesRepository.updateLeague(id, updateLeagueDto);
    if (!updated) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.leaguesRepository.deleteLeague(id);
    if (!removed) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
  }

  async findLeagueUsers(id: string): Promise<ILeagueUser[]> {
    return await this.leaguesRepository.findLeagueUsers(id);
  }

  async addLeagueUser(leagueId: string, addLeagueUserDto: AddLeagueUserDto) {
    return await this.leaguesRepository.addLeagueUser(leagueId, addLeagueUserDto);
  }

  async removeLeagueUser(leagueId: string, userId: string): Promise<boolean> {
    const removed = await this.leaguesRepository.removeLeagueUser(leagueId, userId);
    if (!removed) {
      throw new NotFoundException(`User with id ${userId} not found in league ${leagueId}`);
    }
    return removed;
  }

  async updateLeagueUser(
    leagueId: string,
    userId: string,
    updateLeagueUserDto: UpdateLeagueUserDto,
  ) {
    return await this.leaguesRepository.updateLeagueUser(leagueId, userId, updateLeagueUserDto);
  }

  async createLeagueSettings(
    leagueId: string,
    dto: CreateLeagueSettingsDto,
  ): Promise<ILeagueSettings> {
    const settings = await this.leaguesRepository.createLeagueSettings(leagueId, dto);
    
    // Create default positions based on sport
    if (dto.sportLeague === 'NFL') {
      await this.createDefaultNflPositions(settings.leagueSettingsId);
    } else if (dto.sportLeague === 'GOLF') {
      await this.createDefaultGolfPositions(settings.leagueSettingsId);
    }
    
    return settings;
  }

  async createDefaultNflPositions(leagueSettingsId: string): Promise<void> {
    const defaultNflPositions = [
      { position: 'RB', poolSize: 64 },
      { position: 'WR', poolSize: 96 },
    ];
    
    for (const pos of defaultNflPositions) {
      await this.leaguesRepository.createLeagueSettingsPosition(leagueSettingsId, pos);
    }
  }

  async createDefaultGolfPositions(leagueSettingsId: string): Promise<void> {
    const defaultGolfPositions = [
      { position: 'GOLF_PLAYER_1', poolSize: 150 },
      { position: 'GOLF_PLAYER_2', poolSize: 150 },
      { position: 'GOLF_PLAYER_3', poolSize: 150 },
    ];
    
    for (const pos of defaultGolfPositions) {
      await this.leaguesRepository.createLeagueSettingsPosition(leagueSettingsId, pos);
    }
  }

  async getLatestLeagueSettingsByLeague(leagueId: string): Promise<ILeagueSettings> {
    const latest = await this.leaguesRepository.getLatestLeagueSettingsByLeague(leagueId);
    if (!latest) throw new NotFoundException(`No league settings found for league ${leagueId}`);
    return latest;
  }

  async findLeagueSettings(id: string): Promise<ILeagueSettings> {
    const found = await this.leaguesRepository.findLeagueSettings(id);
    if (!found) throw new NotFoundException(`League settings with id ${id} not found`);
    return found;
  }

  async getLeagueTeams(leagueId: string, season?: number, week?: number): Promise<ITeam[]> {
    let teams = await this.leaguesRepository.findLeagueTeams(leagueId);
    return Array.from(teams).filter((team) => {
      let matches = true;
      if (season) {
        matches = matches && team.seasonYear == season;
      }
      if (week) {
        matches = matches && team.week == week;
      }
      return matches;
    });
  }

  async getPositionsForLeagueSettings(leagueSettingsId: string): Promise<ILeagueSettingsPosition[]> {
    return this.leaguesRepository.getLeagueSettingsPositions(leagueSettingsId);
  }

  async getPositionsForLeague(leagueId: string): Promise<ILeagueSettingsPosition[]> {
    const settings = await this.getLatestLeagueSettingsByLeague(leagueId);
    return this.getPositionsForLeagueSettings(settings.leagueSettingsId);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';
import { AddLeagueUserDto, ILeagueUser, UpdateLeagueUserDto } from './entities/league-user.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';
import {
  CreateLeagueSettingsDto,
  ILeagueSettings,
  ScoringType,
} from '@/leagues/entities/league-settings.entity';

const DEFAULT_LEAGUE_SETTINGS = {
  scoringType: 'PPR' as ScoringType,
  positions: ['RB', 'WR'],
  rbPoolSize: 64,
  wrPoolSize: 96,
  qbPoolSize: 32,
  tePoolSize: 32,
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
    return this.leaguesRepository.createLeagueSettings(leagueId, dto);
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
}

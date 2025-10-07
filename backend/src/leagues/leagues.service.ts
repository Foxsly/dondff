import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';
import {
  AddLeagueUserDto,
  ILeagueUser,
  UpdateLeagueUserDto,
} from './entities/league-user.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';
import {
  CreateLeagueSettingsDto,
  ILeagueSettings,
} from '@/leagues/entities/league-settings.entity';

@Injectable()
export class LeaguesService {
  constructor(private readonly leaguesRepository: LeaguesRepository) {}

  async create(createLeagueDto: CreateLeagueDto): Promise<League> {
    return this.leaguesRepository.createLeague(createLeagueDto);
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
    return await this.leaguesRepository.removeLeagueUser(leagueId, userId);
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

  async getLeagueTeams(leagueId: string): Promise<ITeam[]> {
    return await this.leaguesRepository.findLeagueTeams(leagueId);
  }
}

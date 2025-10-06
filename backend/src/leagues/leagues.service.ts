import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';
import { AddLeagueUserDto, UpdateLeagueUserDto } from './entities/league-user.entity';
import { ITeam } from '@/teams/entities/team.entity';
import { LeaguesRepository } from '@/leagues/leagues.repository';

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

  async findLeagueUsers(id: string) {
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

  async getLeagueTeams(leagueId: string): Promise<ITeam[]> {
    return await this.leaguesRepository.findLeagueTeams(leagueId);
  }
}

import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as lr from './leagues.repository';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';
import { AddLeagueUserDto, UpdateLeagueUserDto } from './entities/league-user.entity';

@Injectable()
export class LeaguesService {
  constructor(
    @Inject(lr.LEAGUES_REPOSITORY)
    private readonly leaguesRepository: lr.ILeaguesRepository,
  ) {}

  async create(createLeagueDto: CreateLeagueDto): Promise<League> {
    return this.leaguesRepository.create(createLeagueDto);
  }

  async findAll(): Promise<League[]> {
    return this.leaguesRepository.findAll();
  }

  async findOne(id: string): Promise<League> {
    const league = await this.leaguesRepository.findOne(id);
    if (!league) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    const updated = await this.leaguesRepository.update(id, updateLeagueDto);
    if (!updated) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.leaguesRepository.remove(id);
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

  async updateLeagueUser(leagueId: string, userId: string, updateLeagueUserDto: UpdateLeagueUserDto) {
    return await this.leaguesRepository.updateLeagueUser(leagueId, userId, updateLeagueUserDto);
  }
}

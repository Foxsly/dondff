import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as leaguesRepository from './leagues.repository';
import { CreateLeagueDto, League, UpdateLeagueDto } from './entities/league.entity';

@Injectable()
export class LeaguesService {
  constructor(
    @Inject(leaguesRepository.LEAGUES_REPOSITORY)
    private readonly repo: leaguesRepository.ILeaguesRepository,
  ) {}

  async create(createLeagueDto: CreateLeagueDto): Promise<League> {
    return this.repo.create(createLeagueDto);
  }

  async findAll(): Promise<League[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<League> {
    const league = await this.repo.findOne(id);
    if (!league) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    const updated = await this.repo.update(id, updateLeagueDto);
    if (!updated) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
  }
}

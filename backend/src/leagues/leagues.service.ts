import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateLeagueDto } from './dto/create-league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import * as leaguesRepository from './leagues.repository';
import { League } from './entities/league.entity';

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

  async findOne(id: number): Promise<League> {
    const league = await this.repo.findOne(id);
    if (!league) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return league;
  }

  async update(id: number, updateLeagueDto: UpdateLeagueDto): Promise<League> {
    const updated = await this.repo.update(id, updateLeagueDto);
    if (!updated) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`League with id ${id} not found`);
    }
  }
}

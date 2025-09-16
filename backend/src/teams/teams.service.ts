import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import * as teamsRepository from './teams.repository';
import { Team } from './entities/team.entity';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(teamsRepository.TEAMS_REPOSITORY)
    private readonly repo: teamsRepository.ITeamsRepository,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    return this.repo.create(createTeamDto);
  }

  async findAll(): Promise<Team[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<Team> {
    const league = await this.repo.findOne(id);
    if (!league) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return league;
  }

  async update(id: number, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const updated = await this.repo.update(id, updateTeamDto);
    if (!updated) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
  }
}

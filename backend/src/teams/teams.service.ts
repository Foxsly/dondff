import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import * as teamsRepository from './teams.repository';
import { CreateTeamDto, Team, UpdateTeamDto } from './entities/team.entity';

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

  async findOne(id: string): Promise<Team> {
    const league = await this.repo.findOne(id);
    if (!league) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return league;
  }

  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const updated = await this.repo.update(id, updateTeamDto);
    if (!updated) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`Team with id ${id} not found`);
    }
  }
}

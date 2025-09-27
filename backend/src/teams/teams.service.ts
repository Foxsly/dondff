import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';
import { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';
import { TEAMS_REPOSITORY } from '@/teams/teams.repository';
import type { ITeamsRepository } from '@/teams/teams.repository';

@Injectable()
export class TeamsService {
  constructor(
    @Inject(TEAMS_REPOSITORY)
    private readonly repo: ITeamsRepository,
  ) {}

  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    return this.repo.create(createTeamDto);
  }

  async findAll(): Promise<ITeam[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<ITeam> {
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

  upsertTeamPlayer(teamId: string, dto: CreateTeamPlayerDto): Promise<TeamPlayer> {
    return this.repo.upsertTeamPlayer(teamId, dto);
  }
}

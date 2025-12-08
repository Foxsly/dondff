import { Controller, Body } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import type { CreateTeamDto, ITeam, Team, UpdateTeamDto } from './entities/team.entity';
import type { CreateTeamPlayerDto, TeamPlayer } from '@/teams/entities/team-player.entity';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @TypedRoute.Post()
  async create(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsService.create(createTeamDto);
  }

  @TypedRoute.Get()
  async findAll(): Promise<ITeam[]> {
    return this.teamsService.findAll();
  }

  @TypedRoute.Get(':id')
  async findOne(@TypedParam('id') id: string): Promise<ITeam> {
    return this.teamsService.findOne(id);
  }

  @TypedRoute.Patch(':id')
  async update(@TypedParam('id') id: string, @Body() updateTeamDto: UpdateTeamDto): Promise<Team> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @TypedRoute.Delete(':id')
  async remove(@TypedParam('id') id: string): Promise<void> {
    return this.teamsService.remove(id);
  }

  @TypedRoute.Put(':teamId/players')
  upsertTeamPlayer(@TypedParam('teamId') teamId: string, @TypedBody() dto: CreateTeamPlayerDto,): Promise<TeamPlayer> {
    return this.teamsService.upsertTeamPlayer(teamId, dto);
  }
}

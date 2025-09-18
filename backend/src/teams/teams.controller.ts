import { Controller, Body } from '@nestjs/common';
import { TeamsService } from './teams.service';
import * as teamEntity from './entities/team.entity';
import { TypedParam, TypedRoute } from '@nestia/core';
import { ITeam, Team } from './entities/team.entity';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @TypedRoute.Post()
  async create(@Body() createTeamDto: teamEntity.CreateTeamDto): Promise<Team> {
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
  async update(
    @TypedParam('id') id: string,
    @Body() updateTeamDto: teamEntity.UpdateTeamDto,
  ): Promise<Team> {
    return this.teamsService.update(id, updateTeamDto);
  }

  @TypedRoute.Delete(':id')
  async remove(@TypedParam('id') id: string): Promise<void> {
    return this.teamsService.remove(id);
  }
}

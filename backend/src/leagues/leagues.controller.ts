import { Controller, Body } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import * as leagueEntity from './entities/league.entity';
import { TypedParam, TypedRoute } from '@nestia/core';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @TypedRoute.Post()
  create(@Body() createLeagueDto: leagueEntity.CreateLeagueDto) {
    return this.leaguesService.create(createLeagueDto);
  }

  @TypedRoute.Get()
  findAll() {
    return this.leaguesService.findAll();
  }

  @TypedRoute.Get(':id')
  findOne(@TypedParam('id') id: string) {
    return this.leaguesService.findOne(id);
  }

  @TypedRoute.Patch(':id')
  update(@TypedParam('id') id: string, @Body() updateLeagueDto: leagueEntity.UpdateLeagueDto) {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id') id: string) {
    return this.leaguesService.remove(id);
  }
}

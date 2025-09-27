import { Controller, Body } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import type {
  AddLeagueUserDto,
  ILeagueUser,
  UpdateLeagueUserDto,
} from './entities/league-user.entity';
import type { CreateLeagueDto, UpdateLeagueDto } from '@/leagues/entities/league.entity';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @TypedRoute.Post()
  create(@Body() createLeagueDto: CreateLeagueDto) {
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
  update(@TypedParam('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto) {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id') id: string) {
    return this.leaguesService.remove(id);
  }

  @TypedRoute.Get(':id/users')
  findLeagueUsers(@TypedParam('id') id: string) {
    return this.leaguesService.findLeagueUsers(id);
  }

  //This is a PUT because it's idempotent - making the same call repeatedly will result in the same end state of ths system
  //TODO if the user already exists, catch the exception and force a 304 return
  @TypedRoute.Put(':id/users')
  addLeagueUser(
    @TypedParam('id') leagueId: string,
    @TypedBody() addLeagueUserDto: AddLeagueUserDto,
  ) {
    return this.leaguesService.addLeagueUser(leagueId, addLeagueUserDto);
  }

  @TypedRoute.Delete(':id/users/:userId')
  removeLeagueUser(
    @TypedParam('id') leagueId: string,
    @TypedParam('userId') userId: string,
  ): Promise<boolean> {
    return this.leaguesService.removeLeagueUser(leagueId, userId);
  }

  @TypedRoute.Put(':id/users/:userId')
  updateLeagueUser(
    @TypedParam('id') leagueId: string,
    @TypedParam('userId') userId: string,
    @TypedBody() updateLeagueUserDto: UpdateLeagueUserDto,
  ): Promise<ILeagueUser> {
    return this.leaguesService.updateLeagueUser(leagueId, userId, updateLeagueUserDto);
  }

  /**
   * Get all teams/entries for a league
   */
  @TypedRoute.Get(':id/teams')
  getLeagueTeams(@TypedParam('id') leagueId: string) {
    return this.leaguesService.getLeagueTeams(leagueId);
  }
}

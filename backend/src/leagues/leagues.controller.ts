import { Controller, Body, Query } from '@nestjs/common';
import { LeaguesService } from './leagues.service';
import { TypedBody, TypedParam, TypedRoute, TypedQuery } from '@nestia/core';
import type {
  AddLeagueUserDto,
  ILeagueUser,
  UpdateLeagueUserDto,
} from './entities/league-user.entity';
import type { CreateLeagueDto, League, UpdateLeagueDto } from '@/leagues/entities/league.entity';
import { ITeam } from '@/teams/entities/team.entity';
import type {
  CreateLeagueSettingsDto,
  ILeagueSettings,
  ILeagueSettingsPosition,
} from '@/leagues/entities/league-settings.entity';

@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @TypedRoute.Post()
  create(@Body() createLeagueDto: CreateLeagueDto): Promise<League> {
    return this.leaguesService.create(createLeagueDto);
  }

  @TypedRoute.Get()
  findAll(): Promise<League[]> {
    return this.leaguesService.findAll();
  }

  @TypedRoute.Get(':id')
  findOne(@TypedParam('id') id: string): Promise<League> {
    return this.leaguesService.findOne(id);
  }

  @TypedRoute.Patch(':id')
  update(@TypedParam('id') id: string, @Body() updateLeagueDto: UpdateLeagueDto): Promise<League> {
    return this.leaguesService.update(id, updateLeagueDto);
  }

  @TypedRoute.Delete(':id')
  remove(@TypedParam('id') id: string): Promise<void> {
    return this.leaguesService.remove(id);
  }

  @TypedRoute.Get(':id/users')
  findLeagueUsers(@TypedParam('id') id: string): Promise<ILeagueUser[]> {
    return this.leaguesService.findLeagueUsers(id);
  }

  //This is a PUT because it's idempotent - making the same call repeatedly will result in the same end state of ths system
  //TODO if the user already exists, catch the exception and force a 304 return
  @TypedRoute.Put(':id/users')
  addLeagueUser(
    @TypedParam('id') leagueId: string,
    @TypedBody() addLeagueUserDto: AddLeagueUserDto,
  ): Promise<ILeagueUser> {
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
  getLeagueTeams(@TypedParam('id') leagueId: string,
                 @Query('season') season: number,
                 @Query('week') week: number): Promise<ITeam[]> {
    return this.leaguesService.getLeagueTeams(leagueId, season, week);
  }

  /**
   * Create a new set of league settings for a league (versioned by time).
   * Path param takes precedence over any leagueId present in the body.
   */
  @TypedRoute.Post(':id/settings')
  createLeagueSettings(
    @TypedParam('id') leagueId: string,
    @TypedBody() body: CreateLeagueSettingsDto,
  ): Promise<ILeagueSettings> {
    // Enforce path param as the source of truth for leagueId
    // const { leagueId: _ignored, ...rest } = body as any;
    return this.leaguesService.createLeagueSettings(leagueId, body);
  }

  /**
   * Fetch the latest (most recently created) league settings for a league.
   */
  @TypedRoute.Get(':id/settings/latest')
  getLatestLeagueSettings(@TypedParam('id') leagueId: string): Promise<ILeagueSettings> {
    return this.leaguesService.getLatestLeagueSettingsByLeague(leagueId);
  }

  /**
   * Fetch a specific league settings by its id.
   */
  @TypedRoute.Get('settings/:settingsId')
  getLeagueSettingsById(@TypedParam('settingsId') settingsId: string): Promise<ILeagueSettings> {
    return this.leaguesService.findLeagueSettings(settingsId);
  }

  /**
   * Get the positions configured for a league based on its settings.
   * Returns the positions from the league_settings_position table.
   */
  @TypedRoute.Get(':id/positions')
  async getLeaguePositions(@TypedParam('id') leagueId: string): Promise<ILeagueSettingsPosition[]> {
    return this.leaguesService.getPositionsForLeague(leagueId);
  }
}

import {
  ITeamEntry,
  ITeamEntryAudit,
  ITeamEntryEvent,
  ITeamEntryOffer,
} from '@/teams/entities/team-entry.entity';
import { IUser } from '@/users/entities/user.entity';
import { Team } from '@/teams/entities/team.entity';
import { ILeague } from '@/leagues/entities/league.entity';
import { ITeamPlayer } from '@/teams/entities/team-player.entity';
import { ILeagueUser } from '@/leagues/entities/league-user.entity';
import { LeagueSettingsRow, ILeagueSettingsPosition } from '@/leagues/entities/league-settings.entity';

//Maps DB table (key) to object (value)a
export interface DB {
  league: ILeague;
  leagueSettings: LeagueSettingsRow;
  leagueSettingsPosition: ILeagueSettingsPosition;
  leagueUser: ILeagueUser;
  team: Team;
  dondUser: IUser;
  teamPlayer: ITeamPlayer;
  teamEntry: ITeamEntry;
  teamEntryAudit: ITeamEntryAudit;
  teamEntryOffer: ITeamEntryOffer;
  teamEntryEvent: ITeamEntryEvent;
}

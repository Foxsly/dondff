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
import { IEventGroup } from '@/events/entities/event-group.entity';
import { IEvent } from '@/events/entities/event.entity';

//Maps DB table (key) to object (value)
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
  eventGroup: IEventGroup;
  event: IEvent;
}

import { IUser } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { ILeague } from '../../leagues/entities/league.entity';
import { ITeamPlayer } from '../../teams/entities/team-player.entity';

export interface LeagueUser {
  leagueId: string;
  userId: string;
  role: string;
}

//Maps DB table (key) to object (value)a
export interface DB {
  league: ILeague;
  leagueUser: LeagueUser;
  team: Team;
  user: IUser;
  teamPlayer: ITeamPlayer;
}

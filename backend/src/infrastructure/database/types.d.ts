import { User } from '../../users/entities/user.entity';
import { Team } from '../../teams/entities/team.entity';
import { League } from '../../leagues/entities/league.entity';

export interface LeagueUser {
  leagueId: string;
  userId: string;
  role: string;
}

export interface DB {
  league: League;
  leagueUser: LeagueUser;
  team: Team;
  user: User;
}

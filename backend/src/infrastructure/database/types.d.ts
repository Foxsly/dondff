import { User } from '../../users/entities/user.entity';

export interface League {
  leagueId: Generated<number | null>;
  name: string;
}

export interface LeagueUser {
  leagueId: number;
  role: string;
  userId: number;
}

export interface Team {
  leagueId: number;
  playerId: number;
  playerName: string;
  position: string;
  seasonYear: number;
  teamId: Generated<number | null>;
  userId: number;
  week: number;
}

export interface DB {
  league: League;
  leagueUser: LeagueUser;
  team: Team;
  user: User;
}

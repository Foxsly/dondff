// ─── Domain types shared across components ────────────────────────────────────

export type SportLeague = 'NFL' | 'GOLF';

export interface User {
  id?: string;
  userId?: string;
  name?: string;
  email?: string;
}

export interface League {
  id?: string;
  leagueId?: string;
  name?: string;
  leagueName?: string;
  role?: string;
  membershipRole?: string;
  userRole?: string;
  currentSeason?: string | number;
  currentWeek?: string | number;
  sportLeague?: SportLeague;
}

export interface LeagueSettings {
  leagueSettingsId: string;
  leagueId: string;
  scoringType: string;
  sportLeague: SportLeague;
}

export interface LeaguePosition {
  leagueSettingsId: string;
  position: string;
  poolSize: number;
}

export interface LeagueMember {
  userId: string;
  role?: string;
  lineupStatus?: string;
  user?: User;
  displayName?: string;
  name?: string;
  email?: string;
}

export interface TeamPlayer {
  playerId?: string;
  playerName?: string;
  position?: string;
  points?: number;
  pprScore?: number;
}

export interface Team {
  teamId: string;
  userId: string;
  leagueId: string;
  seasonYear?: number;
  week?: number;
  players: TeamPlayer[];
  finalScore?: number | null;
}

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

// ─── Legacy standalone game types (cases.tsx) ────────────────────────────────

export interface PoolPlayer {
  name: string;
  points: number;
  status?: string;
  opponent?: string;
  team?: string;
  playerId?: string;
}

export interface GameCase {
  number: number;
  name: string;
  points: number;
  opened: boolean;
  status?: string;
  opponent?: string;
  team?: string;
  playerId?: string;
}

// ─── Backend-backed game types (game.tsx) ────────────────────────────────────

export interface Matchup {
  team?: string;
  opponent?: string;
}

export interface GamePlayer {
  playerId: string;
  playerName: string;
  projectedPoints: number;
  injuryStatus?: string;
  boxStatus: string;
  matchup?: Matchup;
  salary?: number;
}

export interface GameBox {
  boxNumber: number;
  boxStatus: string;
  playerName?: string;
  projectedPoints?: number;
  playerId?: string;
}

export interface GameOffer {
  playerId?: string;
  playerName: string;
  projectedPoints: number;
  injuryStatus?: string;
  matchup?: Matchup;
  status?: string;
  salary?: number;
}

export interface LineUpSlot {
  position: string;
  playerName: string;
  complete: boolean;
}

// ─── Group game ───────────────────────────────────────────────────────────────

export interface TeamUser {
  userId: string;
  user: User;
}

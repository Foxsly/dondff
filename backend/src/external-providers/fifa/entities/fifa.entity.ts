import { tags } from 'typia';

//TODO - remove some of these once we no longer need the passthroughs for testing/debugging purposes.

// -----------------------------
// Player Stats
// -----------------------------
export interface IFifaPlayerStats {
  totalPoints: number;
  avgPoints: number;
  form: number;
  lastRoundPoints: number;
  roundPoints: Record<string, number>;
  nextFixtureFromActiveRound: number | null;
  nextFixtureFromScheduledRound: number | null;
}

// -----------------------------
// Player
// -----------------------------
export interface IFifaPlayer {
  id: number & tags.Minimum<1>;
  firstName: string & tags.MinLength<1>;
  lastName: string & tags.MinLength<1>;
  knownName: string | null;
  squadId: number & tags.Minimum<1>;
  position: string & tags.Pattern<'^(DEF|MID|FWD|GK)$'>;
  price: number & tags.Minimum<0>;
  status: string;
  matchStatus: string | null;
  percentSelected: number;
  roundsSelected: Record<string, number>;
  stats: IFifaPlayerStats;
  oneToWatch: boolean;
  oneToWatchText: string | null;
  qualificationRoundIds: number[];
  fifaId: string | number | null;
}

// -----------------------------
// Squad (Team)
// -----------------------------
export interface IFifaSquad {
  id: number & tags.Minimum<1>;
  name: string & tags.MinLength<1>;
  group: string & tags.MinLength<1>;
  abbr: string & tags.MinLength<2> & tags.MaxLength<4>;
  isEliminated: boolean;
}

// -----------------------------
// Tournament (Individual Match)
// -----------------------------
export interface IFifaTournament {
  id: number & tags.Minimum<1>;
  period: string;
  minutes: number;
  extraMinutes: number;
  venueName: string & tags.MinLength<1>;
  venueCity: string & tags.MinLength<1>;
  venueId: number;
  date: string;
  status: string;
  isSuspended: boolean;
  homeSquadId: number & tags.Minimum<1>;
  awaySquadId: number & tags.Minimum<1>;
  homeSquadName: string & tags.MinLength<1>;
  awaySquadName: string & tags.MinLength<1>;
  homeSquadAbbr: string & tags.MinLength<2> & tags.MaxLength<4>;
  awaySquadAbbr: string & tags.MinLength<2> & tags.MaxLength<4>;
  homeScore: number | null;
  homePenaltyScore: number | null;
  awayScore: number | null;
  awayPenaltyScore: number | null;
  homeGoalScorersAssists: unknown[] | null;
  awayGoalScorersAssists: unknown[] | null;
}

// -----------------------------
// Round
// -----------------------------
export interface IFifaRound {
  id: number & tags.Minimum<1>;
  status: string;
  startDate: string;
  endDate: string;
  tournaments: IFifaTournament[];
  stage: string;
}

// -----------------------------
// Merged projection for a round
// -----------------------------
export interface IFifaPlayerRoundProjection {
  id: number;
  firstName: string;
  lastName: string;
  knownName: string | null;
  position: string;
  price: number;
  status: string;
  fantasyPoints: number;
  team: string;
  opponent: string;
  matchDate: string;
  group: string;
}

// -----------------------------
// Response Types
// -----------------------------
export type FifaRoundResponse = IFifaRound[];
export type FifaPlayerResponse = IFifaPlayer[];
export type FifaSquadResponse = IFifaSquad[];
export type FifaRoundProjectionResponse = IFifaPlayerRoundProjection[];


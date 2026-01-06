export type PlayerEntity = {
  id: number;
  name: string;
  position: PlayerPosition;
  team: string;
  oppTeam: string;
  projectedPoints: number;
  injuryStatus: string;
}

//TODO map sleeper FB->RB, DEF->DST
export type PlayerPosition = 'QB' | 'RB' | 'WR' | 'TE' | 'K' | 'DST';
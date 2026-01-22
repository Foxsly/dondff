import { tags } from 'typia';
import { Selectable } from 'kysely';

export interface ITeamPlayer {
  teamId: string & tags.Format<'uuid'>;
  position: string & tags.Pattern<'^(QB|RB|WR|TE)$'>;
  playerId: string & tags.MinLength<1>;
  playerName: string & tags.MinLength<1>;
}

export type TeamPlayer = Selectable<ITeamPlayer>;
export type UpdateTeamPlayerDto = Partial<Omit<ITeamPlayer, 'teamId' | 'position'>>;

import { tags } from 'typia';
import { Selectable } from 'kysely';

//As much as I would like to use optional fields (? notation), kysely strongly recommends against that:
//https://github.com/kysely-org/kysely/issues/27
//We could create a separate DB DTO that is number | null that then maps to undefined in the repository, if we wanted
export interface ITeamPlayer {
  teamId: string & tags.Format<'uuid'>;
  position: string & tags.MinLength<1>;
  playerId: string & tags.MinLength<1>;
  playerName: string & tags.MinLength<1>;
  projectedPoints?: number | null;
  actualPoints?: number | null;
}

export type TeamPlayer = Selectable<ITeamPlayer>;
export type UpdateTeamPlayerDto = Partial<Omit<ITeamPlayer, 'teamId' | 'position'>>;

import { tags } from 'typia';
import { Selectable } from 'kysely';
import { ILeagueUser } from '../../leagues/entities/league-user.entity';
import { ILeague } from '../../leagues/entities/league.entity';

export interface IUser {
  userId: string & tags.Format<'uuid'>;
  email: string & tags.Format<'email'>;
  name: string & tags.MinLength<1>;
}

export type CreateUserDto = Omit<IUser, 'userId'>;
export type UpdateUserDto = Partial<IUser>;
// export type UpdateUserDto = { userId: IUser['userId'] } & Partial<Omit<IUser, 'userId'>>;
export type User = Selectable<IUser>;
export type UserLeagues = Omit<ILeagueUser, 'userId'> & { leagueName: ILeague['name'] };

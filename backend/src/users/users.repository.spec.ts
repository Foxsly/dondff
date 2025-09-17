// users.repository.spec.ts
import { InMemoryUsersRepository } from './users.repository';
import { CreateUserDto, IUser, User } from './entities/user.entity';

describe('InMemoryUsersRepository', () => {
  let repo: InMemoryUsersRepository;

  beforeEach(() => {
    repo = new InMemoryUsersRepository();
  });

  it('creates and retrieves a user', async () => {
    const user: CreateUserDto = {
      name: 'Alice',
      email: 'alice@example.com',
    };
    const createdUser: User = await repo.create(user);

    const found = await repo.findOne(createdUser.userId);
    expect(found!.email).toEqual(user.email);
    expect(found!.name).toEqual(user.name);
  });

  it('returns null for missing user', async () => {
    const result = await repo.findOne('999');
    expect(result).toBeNull();
  });

  it('updates a user', async () => {
    const user: IUser = {
      userId: 'c15b75c1-1726-4c21-943c-9ad9ddae8738',
      name: 'Alice',
      email: 'alice@example.com',
    };
    await repo.create(user);

    const updated = await repo.update('c15b75c1-1726-4c21-943c-9ad9ddae8738', { name: 'Alice Smith' });
    expect(updated?.name).toBe('Alice Smith');

    const found = await repo.findOne('c15b75c1-1726-4c21-943c-9ad9ddae8738');
    expect(found?.name).toBe('Alice Smith');
  });

  it('removes a user', async () => {
    const user: IUser = {
      userId: 'c15b75c1-1726-4c21-943c-9ad9ddae8738',
      name: 'Alice',
      email: 'alice@example.com',
    };
    await repo.create(user);

    const deleted = await repo.remove('c15b75c1-1726-4c21-943c-9ad9ddae8738');
    expect(deleted).toBe(true);

    const found = await repo.findOne('c15b75c1-1726-4c21-943c-9ad9ddae8738');
    expect(found).toBeNull();
  });

  it('findAll returns all users', async () => {
    const users: IUser[] = [
      {userId: "72db4377-2efc-4025-b8b4-a93f304b562", name:'David Montgomery', email: 'knuckles@detroitlions.com'},
      {userId: "5bd237d4-9b9b-4f77-b5df-8cc841316c39", name: 'Jahmyr Gibbs', email: 'sonic@detroitlions.com'},
    ];
    repo.seed(users);

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all).toEqual(users);
  });
});

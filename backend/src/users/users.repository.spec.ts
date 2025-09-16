// users.repository.spec.ts
import { InMemoryUsersRepository } from './users.repository';
import { User } from './entities/user.entity';

describe('InMemoryUsersRepository', () => {
  let repo: InMemoryUsersRepository;

  beforeEach(() => {
    repo = new InMemoryUsersRepository();
  });

  it('creates and retrieves a user', async () => {
    const user = new User(1, 'Alice', 'alice@example.com');
    await repo.create(user);

    const found = await repo.findOne(1);
    expect(found).toEqual(user);
  });

  it('returns null for missing user', async () => {
    const result = await repo.findOne(999);
    expect(result).toBeNull();
  });

  it('updates a user', async () => {
    const user = new User(1, 'Alice', 'alice@example.com');
    await repo.create(user);

    const updated = await repo.update(1, { name: 'Alice Smith' });
    expect(updated?.name).toBe('Alice Smith');

    const found = await repo.findOne(1);
    expect(found?.name).toBe('Alice Smith');
  });

  it('removes a user', async () => {
    const user = new User(1, 'Alice', 'alice@example.com');
    await repo.create(user);

    const deleted = await repo.remove(1);
    expect(deleted).toBe(true);

    const found = await repo.findOne(1);
    expect(found).toBeNull();
  });

  it('findAll returns all users', async () => {
    const users = [
      new User(1, 'Alice', 'alice@example.com'),
      new User(2, 'Bob', 'bob@example.com'),
    ];
    repo.seed(users);

    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all).toEqual(users);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';
import { USERS_REPOSITORY, IUsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersService', () => {
  let service: UsersService;
  let repo: jest.Mocked<IUsersRepository>;

  beforeEach(async () => {
    const repoMock: jest.Mocked<IUsersRepository> = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: USERS_REPOSITORY,
          useValue: repoMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repo = module.get(USERS_REPOSITORY);
  });

  describe('findAll', () => {
    it('should return all users', async () => {
      const users = [
        new User(1, 'David Montgomery', 'knuckles@detroitlions.com'),
        new User(2, 'Jahmyr Gibbs', 'sonic@detroitlions.com'),
      ];
      repo.findAll.mockResolvedValue(users);

      const result = await service.findAll();

      expect(result).toEqual(users);
      expect(repo.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user if found', async () => {
      const user = new User(1, 'David Montgomery', 'knuckles@detroitlions.com');
      repo.findOne.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(result).toEqual(user);
      expect(repo.findOne).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException if not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(repo.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('create', () => {
    it('should create and return a user', async () => {
      const dto: CreateUserDto = { name: 'Amon-Ra St. Brown', email: 'sungod@detroitlions.com' };
      const created = new User(3, dto.name, dto.email);
      repo.create.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(repo.create).toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('should return updated user when repo succeeds', async () => {
      const dto: UpdateUserDto = { name: 'Updated' };
      const updated = new User(1, 'Updated', 'test@example.com');
      repo.update.mockResolvedValue(updated);

      const result = await service.update(1, dto);

      expect(result).toEqual(updated);
      expect(repo.update).toHaveBeenCalledWith(1, dto);
    });

    it('should throw NotFoundException when repo returns null', async () => {
      repo.update.mockResolvedValue(null);

      await expect(service.update(123, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should resolve when repo returns true', async () => {
      repo.remove.mockResolvedValue(true);

      await expect(service.remove(1)).resolves.toBeUndefined();
      expect(repo.remove).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when repo returns false', async () => {
      repo.remove.mockResolvedValue(false);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

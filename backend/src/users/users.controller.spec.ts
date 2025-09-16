import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  describe('create', () => {
    it('calls service.create and returns result', async () => {
      const dto: CreateUserDto = { name: 'Alice', email: 'alice@example.com' };
      const user = new User(1, 'Alice', 'alice@example.com');
      service.create.mockResolvedValue(user);

      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(user);
    });
  });

  describe('findAll', () => {
    it('returns all users', async () => {
      const users = [new User(1, 'Alice', 'alice@example.com')];
      service.findAll.mockResolvedValue(users);

      const result = await controller.findAll();
      expect(result).toEqual(users);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException when service returns undefined', async () => {
      service.findOne.mockResolvedValueOnce(undefined as any);

      await expect(controller.findOne('123')).rejects.toThrow(NotFoundException);
    });

    it('should return a user when service returns a user', async () => {
      const mockUser = { userId: 1, name: 'Test', email: 'test@example.com' };
      service.findOne.mockResolvedValueOnce(mockUser);

      const result = await controller.findOne('1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('update', () => {
    it('calls service.update with id and dto', async () => {
      const dto: UpdateUserDto = { name: 'Updated' };
      const updated = new User(1, 'Updated', 'alice@example.com');
      service.update.mockResolvedValue(updated);

      const result = await controller.update('1', dto);
      expect(service.update).toHaveBeenCalledWith(1, dto);
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('calls service.remove with id', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove('1');
      expect(service.remove).toHaveBeenCalledWith(1);
      expect(result).toBeUndefined();
    });
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto, IUser, UpdateUserDto, User, UserLeagues } from './entities/user.entity';
import { UsersRepository } from '@/users/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<IUser> {
    return this.repo.create(createUserDto);
  }

  async findAll(): Promise<User[]> {
    return this.repo.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.repo.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const updated = await this.repo.update(id, updateUserDto);
    if (!updated) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: string): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }

  async getLeaguesForUser(userId: string): Promise<UserLeagues[]> {
    return this.repo.getLeagues(userId);
  }
}

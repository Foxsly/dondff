import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import * as usersRepository from './users.repository';

@Injectable()
export class UsersService {
  constructor(
    @Inject(usersRepository.USERS_REPOSITORY)
    private readonly repo: usersRepository.IUsersRepository,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    return this.repo.create(createUserDto);
  }

  async findAll(): Promise<User[]> {
    return this.repo.findAll();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.repo.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const updated = await this.repo.update(id, updateUserDto);
    if (!updated) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
    return updated;
  }

  async remove(id: number): Promise<void> {
    const removed = await this.repo.remove(id);
    if (!removed) {
      throw new NotFoundException(`User with id ${id} not found`);
    }
  }
}

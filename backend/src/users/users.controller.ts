import { Controller, Body, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import type { CreateUserDto, UpdateUserDto, UserLeagues } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TypedRoute.Post()
  async create(@TypedBody() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @TypedRoute.Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @TypedRoute.Get(':id')
  async findOne(@TypedParam('id') id: string) {
    const user = await this.usersService.findOne(id);
    if (user === undefined || user === null) {
      throw new NotFoundException();
    }
    return user;
  }

  @TypedRoute.Patch(':id')
  async update(@TypedParam('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @TypedRoute.Delete(':id')
  async remove(@TypedParam('id') id: string) : Promise<void> {
    return this.usersService.remove(id);
  }

  @TypedRoute.Get(':id/leagues')
  async getLeaguesForUser(@TypedParam('id') id: string): Promise<UserLeagues[]> {
    return this.usersService.getLeaguesForUser(id);
  }
}

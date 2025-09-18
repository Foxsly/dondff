import { Controller, Body, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import * as userEntity from './entities/user.entity';
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @TypedRoute.Post()
  async create(@TypedBody() createUserDto: userEntity.CreateUserDto) {
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
  async update(@TypedParam('id') id: string, @Body() updateUserDto: userEntity.UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @TypedRoute.Delete(':id')
  async remove(@TypedParam('id') id: string) {
    return this.usersService.remove(id);
  }
}

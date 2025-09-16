import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseUsersRepository, USERS_REPOSITORY } from './users.repository';
import { db } from '../infrastructure/database/database';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: USERS_REPOSITORY,
      useClass: DatabaseUsersRepository,
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}

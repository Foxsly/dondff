import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { DatabaseUsersRepository, UsersRepository } from './users.repository';
import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: 'DB_CONNECTION',
      useValue: db,
    },
    {
      provide: UsersRepository,
      useClass: DatabaseUsersRepository,
    },
  ],
  imports: [DatabaseModule],
  exports: [UsersService],
})
export class UsersModule {}

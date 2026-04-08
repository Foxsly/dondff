import { db } from '@/infrastructure/database/database';
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { DatabaseUsersRepository, UsersRepository } from './users.repository';
import { UsersService } from './users.service';

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

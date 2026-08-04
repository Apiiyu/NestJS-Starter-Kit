// Controllers
import { UsersController } from './controllers/users.controller';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { UsersEntity } from './entities/users.entity';

// Services
import { UsersCacheService } from './services/users-cache.service';
import { UsersService } from './services/users.service';

@Module({
  imports: [TypeOrmModule.forFeature([UsersEntity])],
  /**
   * This key was missing entirely, which is why `UsersController` existed as a class
   * Nest never mounted — no route was registered and nothing failed loudly.
   */
  controllers: [UsersController],
  providers: [UsersService, UsersCacheService],
  exports: [UsersService],
})
export class UsersModule {}

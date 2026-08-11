// Controllers
import { UsersController } from './controllers/users.controller';

// Entities
import { UsersEntity } from './entities/users.entity';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Services
import { UsersCacheService } from './services/users-cache.service';
import { UsersService } from './services/users.service';

/**
 * @description The users feature: the entity, its HTTP surface, and the cache that fronts it.
 *
 * Only `UsersService` is exported. `UsersCacheService` stays internal because cache keys are
 * an implementation detail of this module — another module writing to them directly would be
 * able to desynchronise the cache from the table without going through an invalidating write.
 */
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

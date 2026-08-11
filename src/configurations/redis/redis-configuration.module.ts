// Modules
import configuration from './redis-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { RedisConfigService } from './redis-configuration.service';

/**
 * @description Makes the `redis.*` configuration namespace available for injection.
 *
 * `forFeature` rather than `forRoot`: the namespace is registered by whichever modules
 * actually need Redis, so a module that does not import this one cannot silently depend on
 * Redis settings being loaded.
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, RedisConfigService],
  exports: [ConfigService, RedisConfigService],
})
export class RedisConfigModule {}

// Modules
import configuration from './queue-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { QueueConfigService } from './queue-configuration.service';

/**
 * @description Makes the `queue.*` configuration namespace available for injection.
 *
 * The queue keeps its own namespace rather than reusing `redis.*` because BullMQ needs a
 * Redis instance with eviction disabled; pointing it at the cache instance would let Redis
 * drop jobs under memory pressure.
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, QueueConfigService],
  exports: [ConfigService, QueueConfigService],
})
export class QueueConfigModule {}

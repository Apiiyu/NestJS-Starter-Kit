// Modules
import { QueueConfigModule } from './queue-configuration.module';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Services
import { QueueConfigService } from './queue-configuration.service';

/**
 * @description Establishes the BullMQ connection every queue in the application shares.
 *
 * Points at the no-eviction Redis instance rather than the cache one. BullMQ stores job state in
 * Redis, so an instance allowed to evict keys under memory pressure would silently drop queued
 * work.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [QueueConfigModule],
      useFactory: (configService: QueueConfigService) => ({
        connection: {
          host: configService.queueHost,
          port: configService.queuePort,
          password: configService.queuePassword || undefined,
        },
      }),
      inject: [QueueConfigService],
    }),
  ],
  exports: [BullModule],
})
export class QueueProviderModule {}

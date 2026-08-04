// Modules
import { QueueConfigModule } from './queue-configuration.module';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Services
import { QueueConfigService } from './queue-configuration.service';

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

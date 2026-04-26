// Configurations
import configuration from './queue-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { QueueConfigService } from './queue-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, QueueConfigService],
  exports: [ConfigService, QueueConfigService],
})
export class QueueConfigModule {}

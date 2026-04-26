// Configurations
import configuration from './redis-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { RedisConfigService } from './redis-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, RedisConfigService],
  exports: [ConfigService, RedisConfigService],
})
export class RedisConfigModule {}

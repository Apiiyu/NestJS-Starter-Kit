// Configurations
import configuration from './mail-configuration';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { MailConfigService } from './mail-configuration.service';

@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, MailConfigService],
  exports: [ConfigService, MailConfigService],
})
export class MailConfigModule {}

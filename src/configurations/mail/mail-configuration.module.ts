// Modules
import configuration from './mail-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { MailConfigService } from './mail-configuration.service';

/**
 * @description Makes the `mail.*` configuration namespace available for injection, so the
 * mail module can build a transport without reading `process.env` directly.
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, MailConfigService],
  exports: [ConfigService, MailConfigService],
})
export class MailConfigModule {}

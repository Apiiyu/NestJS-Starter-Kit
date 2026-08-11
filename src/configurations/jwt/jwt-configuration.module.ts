// Modules
import configuration from './jwt-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { JwtConfigService } from './jwt-configuration.service';

/**
 * @description Makes the `jwt.*` configuration namespace available for injection, so token
 * signing and verification read their secret and lifetimes from one validated source.
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, JwtConfigService],
  exports: [ConfigService, JwtConfigService],
})
export class JwtConfigModule {}

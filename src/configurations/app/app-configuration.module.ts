// Database
import postgresConfiguration from '../database/postgres/postgres-configuration';

// Modules
import jwtConfiguration from '../jwt/jwt-configuration';
import mailConfiguration from '../mail/mail-configuration';
import queueConfiguration from '../queue/queue-configuration';
import redisConfiguration from '../redis/redis-configuration';
import appConfiguration from './app-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { AppConfigurationsService } from './app-configuration.service';

// Validations
import { validateEnvironment } from './app-env.validation';

/**
 * Import and provide app configuration related classes.
 *
 * @module
 */
/**
 * @description Loads and validates the whole environment, and exposes the application-level
 * settings.
 *
 * The validator runs at import time, so a misconfigured environment stops the process during
 * module resolution — before any listener is bound and long before a request could be served.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [
        appConfiguration,
        postgresConfiguration,
        jwtConfiguration,
        redisConfiguration,
        queueConfiguration,
        mailConfiguration,
      ],
      validate: validateEnvironment,
    }),
  ],
  providers: [ConfigService, AppConfigurationsService],
  exports: [ConfigService, AppConfigurationsService],
})
export class AppConfigurationModule {}

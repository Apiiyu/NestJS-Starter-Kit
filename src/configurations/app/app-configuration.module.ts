// Configurations
import appConfiguration from './app-configuration';
import postgresConfiguration from '../database/postgres/postgres-configuration';
import jwtConfiguration from '../jwt/jwt-configuration';
import redisConfiguration from '../redis/redis-configuration';
import queueConfiguration from '../queue/queue-configuration';
import mailConfiguration from '../mail/mail-configuration';
import { validateEnvironment } from './app-env.validation';

// NestJS Libraries
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

// Services
import { AppConfigurationsService } from './app-configuration.service';

/**
 * Import and provide app configuration related classes.
 *
 * @module
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

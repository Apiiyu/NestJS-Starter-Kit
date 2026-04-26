// Configuration Modules
import { RequestContextModule } from './common/request-context/request-context.module';
import { ContextInterceptor } from './common/interceptors/context.interceptor';
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';

// Guards
import { APP_GUARD } from '@nestjs/core';

// Health
import { HealthModule } from './configurations/health/health.module';

// Logger
import { AppLoggerModule } from './configurations/logger/logger.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { UsersModule } from './modules/users/users.module';

// NestJS Libraries
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';

// Providers
import { PostgresDatabaseProviderModule } from './database/postgres/postgres-provider.module';
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';

// Services
import { AppConfigurationsService } from './configurations/app/app-configuration.service';

// Throttler
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    // Configuration Modules
    AppConfigurationModule,
    DatabasePostgresConfigModule,
    PostgresDatabaseProviderModule,
    RequestContextModule,

    // Infrastructure
    AppLoggerModule,
    HealthModule,
    ThrottlerModule.forRootAsync({
      imports: [AppConfigurationModule],
      inject: [AppConfigurationsService],
      useFactory: (config: AppConfigurationsService) => [
        { ttl: config.throttleTtl, limit: config.throttleLimit },
      ],
    }),

    // Core Feature Modules
    AuthenticationModule,
    UsersModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    ContextInterceptor,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      method: RequestMethod.ALL,
      path: '*',
    });
  }
}

// Configuration Modules
import { RequestContextModule } from './common/request-context/request-context.module';
import { ContextInterceptor } from './common/interceptors/context.interceptor';
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { CacheProviderModule } from './configurations/cache/cache-provider.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';
import { QueueProviderModule } from './configurations/queue/queue-provider.module';

// Filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Guards
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

// Health
import { HealthModule } from './configurations/health/health.module';
import { MetricsModule } from './configurations/metrics/metrics.module';

// Logger
import { AppLoggerModule } from './configurations/logger/logger.module';

// Modules
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
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
    CacheProviderModule,
    DatabasePostgresConfigModule,
    PostgresDatabaseProviderModule,
    QueueProviderModule,
    RequestContextModule,

    // Infrastructure
    AppLoggerModule,
    HealthModule,
    MaintenanceModule,
    MetricsModule,
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
    /**
     * Registered through the DI container rather than `app.useGlobalFilters()` in
     * `main.ts`, because the filter injects `RequestContextService` to stamp the
     * request id onto error bodies — a manually constructed filter gets no injector.
     */
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
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

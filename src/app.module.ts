// Filters
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

// Interceptors
import { ContextInterceptor } from './common/interceptors/context.interceptor';

// Middlewares
import { RequestContextMiddleware } from './common/request-context/request-context.middleware';

// Modules
import { RequestContextModule } from './common/request-context/request-context.module';
import { AppConfigurationModule } from './configurations/app/app-configuration.module';
import { CacheProviderModule } from './configurations/cache/cache-provider.module';
import { DatabasePostgresConfigModule } from './configurations/database/postgres/postgres-configuration.module';
import { HealthModule } from './configurations/health/health.module';
import { AppLoggerModule } from './configurations/logger/logger.module';
import { MetricsModule } from './configurations/metrics/metrics.module';
import { QueueProviderModule } from './configurations/queue/queue-provider.module';
import { PostgresDatabaseProviderModule } from './database/postgres/postgres-provider.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { UsersModule } from './modules/users/users.module';

// NestJS Libraries
import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

// Services
import { AppConfigurationsService } from './configurations/app/app-configuration.service';

// Throttler
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

/**
 * @description The application root: every configuration, persistence, and feature module, plus
 * the globally-registered guards, filters, and interceptors.
 *
 * Global behaviour that belongs to the HTTP pipeline itself — the `/api` prefix, URI
 * versioning, the validation pipe — lives in `configure-app.ts` instead, because both `main.ts`
 * and the E2E bootstrap call it. Putting any of it here or in `main.ts` alone would mean the
 * tests exercise a differently configured application than the one deployed.
 */
/**
 * @description The application root: every configuration, persistence, and feature module, plus
 * the globally-registered guards, filters, and interceptors.
 *
 * Global behaviour that belongs to the HTTP pipeline itself — the `/api` prefix, URI
 * versioning, the validation pipe — lives in `configure-app.ts` instead, because both `main.ts`
 * and the E2E bootstrap call it. Putting any of it here or in `main.ts` alone would mean the
 * tests exercise a differently configured application than the one deployed.
 */
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
  /**
   * @description Applies the request-context middleware to every route.
   *
   * Middleware rather than a global interceptor, because middleware runs before guards — a
   * request rejected by authentication still gets a request ID and stays traceable in the logs.
   *
   * @param consumer Nest's middleware consumer for this module.
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes({
      method: RequestMethod.ALL,
      path: '*',
    });
  }
}

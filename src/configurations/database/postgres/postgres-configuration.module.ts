// Modules
import configuration from './postgres-configuration';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Services
import { DatabasePostgresConfigService } from './postgres-configuration.service';

/**
 * Import and provide app configuration related classes.
 *
 * @module
 */
/**
 * @description Makes the `databasePostgres.*` configuration namespace available for injection,
 * so the data source is built from validated settings rather than from `process.env`.
 */
@Module({
  imports: [ConfigModule.forFeature(configuration)],
  providers: [ConfigService, DatabasePostgresConfigService],
  exports: [ConfigService, DatabasePostgresConfigService],
})
export class DatabasePostgresConfigModule {}

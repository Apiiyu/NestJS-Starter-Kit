// Modules
import { DatabasePostgresConfigModule } from '../../configurations/database/postgres/postgres-configuration.module';

// NestJS Libraries
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

// Services
import { DatabasePostgresConfigService } from '../../configurations/database/postgres/postgres-configuration.service';

// TypeORM
import { DatabaseType } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [DatabasePostgresConfigModule],
      useFactory: async (pgConfigService: DatabasePostgresConfigService) => ({
        type: 'postgres' as DatabaseType,
        autoLoadEntities: true,
        host: pgConfigService.databaseHost,
        port: pgConfigService.databasePort,
        username: pgConfigService.databaseUser,
        password: pgConfigService.databasePassword,
        database: pgConfigService.databaseName,
        entities: [],
        /**
         * @description Resolved from this file's own location so the same glob works
         * for `src/**` under ts-node/watch and for `dist/**` after `nest build` —
         * a hardcoded `src/` path would silently find zero migrations in production.
         */
        migrations: [`${__dirname}/migrations/*{.ts,.js}`],
        /**
         * @description Off by default. Auto-running migrations on boot is convenient
         * in dev and a foot-gun in production, where several replicas starting at once
         * race for the same lock. Turn it on per environment, deliberately.
         */
        migrationsRun: pgConfigService.databaseMigrationsRun,
        subscribers: [],
        synchronize: pgConfigService.databaseSync,
        logging: pgConfigService.databaseLogging,
        namingStrategy: new SnakeNamingStrategy(),
      }),
      inject: [DatabasePostgresConfigService],
    } as TypeOrmModuleAsyncOptions),
  ],
})
export class PostgresDatabaseProviderModule {}

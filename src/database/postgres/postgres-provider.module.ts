// Modules
import { DatabasePostgresConfigModule } from '../../configurations/database/postgres/postgres-configuration.module';
import { RedisConfigModule } from '../../configurations/redis/redis-configuration.module';

// NestJS Libraries
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

// Services
import { DatabasePostgresConfigService } from '../../configurations/database/postgres/postgres-configuration.service';
import { RedisConfigService } from '../../configurations/redis/redis-configuration.service';

// TypeORM
import { DatabaseType } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [DatabasePostgresConfigModule, RedisConfigModule],
      useFactory: async (
        pgConfigService: DatabasePostgresConfigService,
        redisConfigService: RedisConfigService,
      ) => ({
        type: 'postgres' as DatabaseType,
        autoLoadEntities: true,
        host: pgConfigService.databaseHost,
        port: pgConfigService.databasePort,
        username: pgConfigService.databaseUser,
        password: pgConfigService.databasePassword,
        database: pgConfigService.databaseName,
        entities: [],
        migrations: [],
        subscribers: [],
        synchronize: pgConfigService.databaseSync,
        logging: pgConfigService.databaseLogging,
        namingStrategy: new SnakeNamingStrategy(),
        /**
         * @description Query result cache backing `.cache()` calls in repositories.
         * Without this block TypeORM throws CannotUseCacheError at runtime, which is
         * what broke GET /api/v1/users. `ignoreErrors` keeps a Redis outage from
         * taking the read path down with it — queries fall through to Postgres.
         */
        cache: {
          type: 'ioredis' as const,
          options: {
            host: redisConfigService.redisHost,
            port: redisConfigService.redisPort,
            username: redisConfigService.redisUsername || undefined,
            password: redisConfigService.redisPassword || undefined,
          },
          duration: 60_000,
          ignoreErrors: true,
        },
      }),
      inject: [DatabasePostgresConfigService, RedisConfigService],
    } as TypeOrmModuleAsyncOptions),
  ],
})
export class PostgresDatabaseProviderModule {}

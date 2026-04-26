// Modules
import { DatabasePostgresConfigModule } from '../../configurations/database/postgres/postgres-configuration.module';

// NestJS Libraries
import { TypeOrmModule, TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';

// Services
import { DatabasePostgresConfigService } from '../../configurations/database/postgres/postgres-configuration.service';

// TypeORM
import { DatabaseType } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

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
        migrations: [],
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

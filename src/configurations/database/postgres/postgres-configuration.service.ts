// NestJS Libraries
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

/**
 * Service dealing with app config based operations.
 *
 * @class
 */
@Injectable()
export class DatabasePostgresConfigService {
  constructor(private readonly _configurationService: ConfigService) {}

  /**
   * @description Define getter for get database name
   */
  get databaseName(): string {
    return this._configurationService.getOrThrow<string>('databasePostgres.databaseName');
  }

  /**
   * @description Define getter for get database host
   */
  get databaseHost(): string {
    return this._configurationService.getOrThrow<string>('databasePostgres.databaseHost');
  }

  /**
   * @description Define getter for get database user
   */
  get databaseUser(): string {
    return this._configurationService.getOrThrow<string>('databasePostgres.databaseUser');
  }

  /**
   * @description Define getter for get database password
   */
  get databasePassword(): string {
    return this._configurationService.getOrThrow<string>('databasePostgres.databasePassword');
  }

  /**
   * @description Define getter for get database port
   */
  get databasePort(): number {
    return this._configurationService.getOrThrow<number>('databasePostgres.databasePort');
  }

  /**
   * @description Define getter for get database sync
   */
  get databaseSync(): boolean {
    return (
      this._configurationService.getOrThrow<string>('databasePostgres.databaseSync') === 'true'
    );
  }

  /**
   * @description Define getter for get database logging
   */
  get databaseLogging(): boolean {
    return (
      this._configurationService.getOrThrow<string>('databasePostgres.databaseLogging') === 'true'
    );
  }

  /**
   * @description Whether pending migrations run automatically on application boot.
   *
   * Optional, and the only getter here using `get` rather than `getOrThrow`: this
   * variable landed after the starter kit already had users, so demanding it would
   * break every existing `.env` on upgrade. Absent means `false`, which is also the
   * right production default — see `postgres-provider.module.ts`.
   */
  get databaseMigrationsRun(): boolean {
    return (
      this._configurationService.get<string>('databasePostgres.databaseMigrationsRun') === 'true'
    );
  }
}

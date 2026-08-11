// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
/**
 * @description Typed read access to the application-level settings — name, environment, host
 * and port, CORS origins, proxy trust, and the metrics API key.
 *
 * The one place these are read from. A service reaching into `process.env` directly would
 * bypass the boot-time validation and could see a value the validator would have rejected.
 */
@Injectable()
export class AppConfigurationsService {
  constructor(private readonly _configurationsService: ConfigService) {}

  /**
   * @description Define getter for get app name
   */
  get appName(): string {
    return this._configurationsService.getOrThrow<string>('app.appName');
  }

  /**
   * @description Define getter for get app host
   */
  get appHost(): string {
    return this._configurationsService.getOrThrow<string>('app.appHost');
  }

  /**
   * @description Define getter for get app port
   */
  get appPort(): number {
    return this._configurationsService.getOrThrow<number>('app.appPort');
  }

  /**
   * @description Define getter for get app environment
   */
  get appEnv(): string {
    return this._configurationsService.getOrThrow<string>('app.appEnv');
  }

  /**
   * @description Define getter for get api external base url
   */
  get apiExternalBaseUrl(): string {
    return this._configurationsService.getOrThrow<string>('app.apiExternalBaseUrl');
  }

  get corsOrigins(): string[] {
    const rawValue = this._configurationsService.get<string>('app.appCorsOrigins') ?? '';

    if (rawValue.trim().length === 0) {
      return [];
    }

    return rawValue
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }

  get trustProxy(): boolean {
    return this._configurationsService.getOrThrow<string>('app.appTrustProxy') === 'true';
  }

  get metricsApiKey(): string {
    return this._configurationsService.getOrThrow<string>('app.metricsApiKey');
  }

  get otelEnabled(): boolean {
    return this._configurationsService.getOrThrow<string>('app.otelEnabled') === 'true';
  }

  get otelMetricsEnabled(): boolean {
    return this._configurationsService.getOrThrow<string>('app.otelMetricsEnabled') === 'true';
  }

  get otelExportInterval(): number {
    return this._configurationsService.getOrThrow<number>('app.otelExportInterval');
  }

  get throttleTtl(): number {
    return this._configurationsService.getOrThrow<number>('app.throttleTtl');
  }

  get throttleLimit(): number {
    return this._configurationsService.getOrThrow<number>('app.throttleLimit');
  }
}

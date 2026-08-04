// NestJS Libraries
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

/**
 * Service dealing with app config based operations.
 *
 * @class
 */
@Injectable()
export class JwtConfigService {
  constructor(private readonly _configurationService: ConfigService) {}

  /**
   * @description Define getter for get jwt secret
   */
  get jwtSecret(): string {
    return this._configurationService.getOrThrow<string>('jwt.jwtSecret');
  }

  /**
   * @description Define getter for get jwt exp
   */
  get jwtExp(): string {
    return this._configurationService.getOrThrow<string>('jwt.jwtExp');
  }

  /**
   * @description Define getter for get jwt issuer
   */
  get jwtIssuer(): string {
    return this._configurationService.getOrThrow<string>('jwt.jwtIssuer');
  }

  /**
   * @description Define getter for get refresh token lifetime
   */
  get jwtRefreshExp(): string {
    return this._configurationService.getOrThrow<string>('jwt.jwtRefreshExp');
  }
}

// NestJS Libraries
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * @description Typed read access to the JWT signing and lifetime settings.
 *
 * Every getter uses `getOrThrow` rather than a fallback: an unset `JWT_SECRET` must stop the
 * application, not quietly sign tokens with `undefined`, which would make every token forgeable.
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

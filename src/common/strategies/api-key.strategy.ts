// Constants
import { API_KEY_HEADER, API_KEY_STRATEGY } from '../constants/api-key.constant';
import { ERROR_CODE } from '../constants/error-code.constant';

// Express
import type { Request } from 'express';

// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Node Libraries
import { createHash, timingSafeEqual } from 'node:crypto';

// Passport
import { Strategy } from 'passport-custom';

// Services
import { AppConfigurationsService } from '../../configurations/app/app-configuration.service';

/**
 * @description Authenticates the metrics endpoint against a static API key supplied in a
 * request header.
 *
 * A dedicated strategy rather than the JWT one because the caller is a scraper, not a person:
 * Prometheus has no session, no refresh token, and no way to complete a login flow.
 */
@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, API_KEY_STRATEGY) {
  constructor(private readonly _appConfiguration: AppConfigurationsService) {
    super();
  }

  /**
   * @description Reduces a candidate key to a fixed-length SHA-256 digest.
   *
   * Hashing is what makes the constant-time comparison possible at all — digests of two
   * different keys are always the same length, whereas the raw values are not, and
   * `timingSafeEqual` throws on a length mismatch. A missing header hashes the empty string
   * so an absent key takes exactly the same path as a wrong one.
   *
   * @param apiKey The key as it arrived, or undefined when the header was absent.
   */
  private _digestApiKey(apiKey: string | undefined): Buffer {
    return createHash('sha256')
      .update(apiKey ?? '')
      .digest();
  }

  /**
   * @description Accepts the request when its API key header matches the configured key, and
   * throws otherwise. Passport calls this for every request on a route guarded by this
   * strategy.
   *
   * @param request The incoming request, read only for the API key header.
   */
  public validate(request: Request): true {
    const candidateDigest = this._digestApiKey(request.get(API_KEY_HEADER));
    const expectedDigest = this._digestApiKey(this._appConfiguration.metricsApiKey);

    /**
     * Hash both inputs first so the buffers always have equal length. Calling
     * `timingSafeEqual` on the raw values would throw for different lengths, while a
     * normal equality operator leaks early-exit timing. Environment validation enforces
     * a 32-byte minimum; operators must still generate the value from a high-entropy
     * source as documented in `.env.example`.
     */
    if (!timingSafeEqual(candidateDigest, expectedDigest)) {
      throw new UnauthorizedException({
        errorCode: ERROR_CODE.AUTH_API_KEY_INVALID,
        message: 'API key is missing or invalid.',
      });
    }

    return true;
  }
}

// Constants
import { API_KEY_HEADER, API_KEY_STRATEGY } from '../constants/api-key.constant';
import { ERROR_CODE } from '../constants/error-code.constant';

// Crypto
import { createHash, timingSafeEqual } from 'node:crypto';

// Express
import type { Request } from 'express';

// NestJS Libraries
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';

// Passport
import { Strategy } from 'passport-custom';

// Services
import { AppConfigurationsService } from '../../configurations/app/app-configuration.service';

const digestApiKey = (apiKey: string | undefined): Buffer =>
  createHash('sha256')
    .update(apiKey ?? '')
    .digest();

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, API_KEY_STRATEGY) {
  constructor(private readonly _appConfiguration: AppConfigurationsService) {
    super();
  }

  public validate(request: Request): true {
    const candidateDigest = digestApiKey(request.get(API_KEY_HEADER));
    const expectedDigest = digestApiKey(this._appConfiguration.metricsApiKey);

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

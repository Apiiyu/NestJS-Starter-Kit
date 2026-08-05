// NestJS Libraries
import { UnauthorizedException } from '@nestjs/common';

// Express
import type { Request } from 'express';

// Constants
import { ERROR_CODE } from '../constants/error-code.constant';

// Services
import type { AppConfigurationsService } from '../../configurations/app/app-configuration.service';

// Strategies
import { ApiKeyStrategy } from './api-key.strategy';

const METRICS_API_KEY = 'correct-metrics-key-with-32-bytes';

const requestWithApiKey = (apiKey?: string): Request =>
  ({
    get: jest.fn().mockReturnValue(apiKey),
  }) as unknown as Request;

const responseOf = (error: unknown): Record<string, unknown> =>
  (error as UnauthorizedException).getResponse() as Record<string, unknown>;

describe('ApiKeyStrategy', () => {
  const appConfiguration = { metricsApiKey: METRICS_API_KEY } as AppConfigurationsService;
  const strategy = new ApiKeyStrategy(appConfiguration);

  it('accepts the configured API key', () => {
    expect(strategy.validate(requestWithApiKey(METRICS_API_KEY))).toBe(true);
  });

  it.each([
    ['a missing key', undefined],
    ['a wrong key with equal byte length', 'incorrect-metrics-key-with-32-byt'],
    ['a wrong key with a different byte length', 'short'],
  ])('rejects %s without exposing comparison details', (_label, apiKey) => {
    try {
      strategy.validate(requestWithApiKey(apiKey));
      throw new Error('Expected the API key strategy to reject.');
    } catch (error) {
      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(responseOf(error)).toEqual({
        errorCode: ERROR_CODE.AUTH_API_KEY_INVALID,
        message: 'API key is missing or invalid.',
      });
    }
  });
});

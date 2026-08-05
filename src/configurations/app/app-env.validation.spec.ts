// Validation
import { validateEnvironment } from './app-env.validation';

const validEnvironment = {
  API_EXTERNAL_BASE_URL: 'http://127.0.0.1:1337',
  APP_ENV: 'test' as const,
  APP_HOST: '127.0.0.1',
  APP_NAME: 'test-app',
  APP_PORT: '1337',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_NAME: 'test',
  DATABASE_PASSWORD: 'test',
  DATABASE_PORT: '5432',
  DATABASE_USER: 'test',
  JWT_EXPIRES_IN: '15m',
  JWT_ISSUER: 'test-app',
  JWT_SECRET: 'test-jwt-secret',
  METRICS_API_KEY: 'correct-metrics-key-with-32-bytes',
};

describe('validateEnvironment metrics API key', () => {
  it('requires an API key because the metrics endpoint is always mounted', () => {
    expect(() => validateEnvironment({ ...validEnvironment, METRICS_API_KEY: undefined })).toThrow(
      'Environment variable METRICS_API_KEY is required.',
    );
  });

  it('rejects keys shorter than 32 bytes', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, METRICS_API_KEY: 'too-short' }),
    ).toThrow('Environment variable METRICS_API_KEY must be at least 32 bytes.');
  });

  it('preserves a valid key exactly', () => {
    expect(validateEnvironment(validEnvironment).METRICS_API_KEY).toBe(
      validEnvironment.METRICS_API_KEY,
    );
  });
});

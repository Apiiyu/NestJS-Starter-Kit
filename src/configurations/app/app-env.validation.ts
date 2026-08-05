const APP_ENVIRONMENTS = ['development', 'test', 'staging', 'production'] as const;

type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

type AppEnvironmentVariables = {
  API_EXTERNAL_BASE_URL: string;
  APP_CORS_ORIGINS?: string;
  APP_ENV: AppEnvironment;
  APP_HOST: string;
  APP_NAME: string;
  APP_PORT: string;
  APP_TRUST_PROXY?: string;
  DATABASE_HOST: string;
  DATABASE_LOGGING?: string;
  DATABASE_NAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_PORT: string;
  DATABASE_SYNCHRONIZE?: string;
  DATABASE_USER: string;
  JWT_EXPIRES_IN: string;
  JWT_ISSUER: string;
  JWT_SECRET: string;
  MAIL_FROM?: string;
  MAIL_HOST?: string;
  MAIL_PASSWORD?: string;
  MAIL_PORT?: string;
  MAIL_USERNAME?: string;
  METRICS_API_KEY: string;
  OTEL_ENABLED?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_EXPORT_INTERVAL?: string;
  OTEL_LOG_LEVEL?: string;
  OTEL_METRICS_ENABLED?: string;
  OTEL_SERVICE_NAME?: string;
  OTEL_SERVICE_VERSION?: string;
  QUEUE_REDIS_HOST?: string;
  QUEUE_REDIS_PASSWORD?: string;
  QUEUE_REDIS_PORT?: string;
  REDIS_HOST?: string;
  REDIS_PASSWORD?: string;
  REDIS_PORT?: string;
  THROTTLE_LIMIT?: string;
  THROTTLE_TTL?: string;
};

/**
 * @description Read one environment variable without indexing the bag by a variable.
 *
 * `environment` is built from `process.env`, so its keys are outside this file's control
 * and `environment[key]` also answers for inherited members. Matching over own entries
 * keeps the lookup to what was actually supplied. This runs a handful of times at
 * bootstrap over roughly thirty keys, so the linear scan costs nothing worth measuring.
 */
const readEnvironmentValue = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
): string | undefined => Object.entries(environment).find(([name]) => name === key)?.[1];

const assertRequired = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
): string => {
  const value = readEnvironmentValue(environment, key);

  if (!value || value.trim().length === 0) {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
};

const assertMinimumBytes = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
  minimumBytes: number,
): string => {
  const value = assertRequired(environment, key);

  if (Buffer.byteLength(value, 'utf8') < minimumBytes) {
    throw new Error(`Environment variable ${key} must be at least ${minimumBytes} bytes.`);
  }

  return value;
};

const parsePositiveInteger = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
  fallback?: number,
): number => {
  const rawValue = readEnvironmentValue(environment, key);

  if (!rawValue || rawValue.trim().length === 0) {
    if (fallback !== undefined) {
      return fallback;
    }

    throw new Error(`Environment variable ${key} is required.`);
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${key} must be a positive integer.`);
  }

  return parsedValue;
};

const parseBoolean = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
  fallback: boolean,
): boolean => {
  const rawValue = readEnvironmentValue(environment, key);

  if (!rawValue || rawValue.trim().length === 0) {
    return fallback;
  }

  if (rawValue === 'true') {
    return true;
  }

  if (rawValue === 'false') {
    return false;
  }

  throw new Error(`Environment variable ${key} must be either "true" or "false".`);
};

const parseOptionalUrl = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
): string | undefined => {
  const rawValue = readEnvironmentValue(environment, key);

  if (!rawValue || rawValue.trim().length === 0) {
    return undefined;
  }

  try {
    return new URL(rawValue).toString();
  } catch {
    throw new Error(`Environment variable ${key} must be a valid URL.`);
  }
};

const parseOptionalLogLevel = (
  environment: Partial<AppEnvironmentVariables>,
  key: keyof AppEnvironmentVariables,
): string | undefined => {
  const rawValue = readEnvironmentValue(environment, key);

  if (!rawValue || rawValue.trim().length === 0) {
    return undefined;
  }

  const supportedLogLevels = ['debug', 'info', 'warn', 'error'];

  if (!supportedLogLevels.includes(rawValue)) {
    throw new Error(
      `Environment variable ${key} must be one of: ${supportedLogLevels.join(', ')}.`,
    );
  }

  return rawValue;
};

export const validateEnvironment = (
  environment: Partial<AppEnvironmentVariables>,
): AppEnvironmentVariables => {
  const appEnv = assertRequired(environment, 'APP_ENV') as AppEnvironment;

  if (!APP_ENVIRONMENTS.includes(appEnv)) {
    throw new Error(`Environment variable APP_ENV must be one of: ${APP_ENVIRONMENTS.join(', ')}.`);
  }

  const validatedEnvironment: AppEnvironmentVariables = {
    API_EXTERNAL_BASE_URL: parseOptionalUrl(environment, 'API_EXTERNAL_BASE_URL') ?? '',
    APP_CORS_ORIGINS: environment.APP_CORS_ORIGINS?.trim(),
    APP_ENV: appEnv,
    APP_HOST: assertRequired(environment, 'APP_HOST'),
    APP_NAME: assertRequired(environment, 'APP_NAME'),
    APP_PORT: String(parsePositiveInteger(environment, 'APP_PORT')),
    APP_TRUST_PROXY: String(parseBoolean(environment, 'APP_TRUST_PROXY', true)),
    DATABASE_HOST: assertRequired(environment, 'DATABASE_HOST'),
    DATABASE_LOGGING: String(parseBoolean(environment, 'DATABASE_LOGGING', false)),
    DATABASE_NAME: assertRequired(environment, 'DATABASE_NAME'),
    DATABASE_PASSWORD: assertRequired(environment, 'DATABASE_PASSWORD'),
    DATABASE_PORT: String(parsePositiveInteger(environment, 'DATABASE_PORT')),
    DATABASE_SYNCHRONIZE: String(parseBoolean(environment, 'DATABASE_SYNCHRONIZE', false)),
    DATABASE_USER: assertRequired(environment, 'DATABASE_USER'),
    JWT_EXPIRES_IN: assertRequired(environment, 'JWT_EXPIRES_IN'),
    JWT_ISSUER: assertRequired(environment, 'JWT_ISSUER'),
    JWT_SECRET: assertRequired(environment, 'JWT_SECRET'),
    MAIL_FROM: environment.MAIL_FROM?.trim(),
    MAIL_HOST: environment.MAIL_HOST?.trim(),
    MAIL_PASSWORD: environment.MAIL_PASSWORD?.trim(),
    MAIL_PORT: environment.MAIL_PORT?.trim(),
    MAIL_USERNAME: environment.MAIL_USERNAME?.trim(),
    METRICS_API_KEY: assertMinimumBytes(environment, 'METRICS_API_KEY', 32),
    OTEL_ENABLED: String(parseBoolean(environment, 'OTEL_ENABLED', false)),
    OTEL_EXPORTER_OTLP_ENDPOINT: parseOptionalUrl(environment, 'OTEL_EXPORTER_OTLP_ENDPOINT'),
    OTEL_EXPORTER_OTLP_METRICS_ENDPOINT: parseOptionalUrl(
      environment,
      'OTEL_EXPORTER_OTLP_METRICS_ENDPOINT',
    ),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: parseOptionalUrl(
      environment,
      'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT',
    ),
    OTEL_EXPORT_INTERVAL: String(parsePositiveInteger(environment, 'OTEL_EXPORT_INTERVAL', 30000)),
    OTEL_LOG_LEVEL: parseOptionalLogLevel(environment, 'OTEL_LOG_LEVEL'),
    OTEL_METRICS_ENABLED: String(parseBoolean(environment, 'OTEL_METRICS_ENABLED', true)),
    OTEL_SERVICE_NAME: environment.OTEL_SERVICE_NAME?.trim(),
    OTEL_SERVICE_VERSION: environment.OTEL_SERVICE_VERSION?.trim(),
    QUEUE_REDIS_HOST: environment.QUEUE_REDIS_HOST?.trim(),
    QUEUE_REDIS_PASSWORD: environment.QUEUE_REDIS_PASSWORD?.trim(),
    QUEUE_REDIS_PORT: environment.QUEUE_REDIS_PORT?.trim(),
    REDIS_HOST: environment.REDIS_HOST?.trim(),
    REDIS_PASSWORD: environment.REDIS_PASSWORD?.trim(),
    REDIS_PORT: environment.REDIS_PORT?.trim(),
    THROTTLE_LIMIT: String(parsePositiveInteger(environment, 'THROTTLE_LIMIT', 100)),
    THROTTLE_TTL: String(parsePositiveInteger(environment, 'THROTTLE_TTL', 60000)),
  };

  return validatedEnvironment;
};

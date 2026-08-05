import 'reflect-metadata';

// Node.js
import path from 'node:path';
import { randomUUID } from 'node:crypto';

// Test
import { setE2EContainerState, stopE2EContainers } from './e2e-container-state';

// Testcontainers
import type { StartedTestContainer } from 'testcontainers';
import { GenericContainer, Wait } from 'testcontainers';

// TypeORM
import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

// Strategies
import { SnakeNamingStrategy } from '../src/database/postgres/snake-naming.strategy';

const DATABASE_NAME = 'nestjs_starter_kit_e2e';
const DATABASE_PASSWORD = 'postgres';
const DATABASE_USER = 'postgres';
const POSTGRES_PORT = 5432;
const REDIS_PORT = 6379;
const SETUP_TIMEOUT_MS = 60_000;

const withTimeout = async <T>(
  operation: Promise<T>,
  timeoutMs: number,
  description: string,
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${description} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const startPostgresContainer = async (): Promise<StartedTestContainer> =>
  new GenericContainer('postgres:17-alpine')
    .withEnvironment({
      POSTGRES_DB: DATABASE_NAME,
      POSTGRES_PASSWORD: DATABASE_PASSWORD,
      POSTGRES_USER: DATABASE_USER,
    })
    .withExposedPorts(POSTGRES_PORT)
    .withStartupTimeout(SETUP_TIMEOUT_MS)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections', 2))
    .start();

const startRedisContainer = async (): Promise<StartedTestContainer> =>
  new GenericContainer('redis:7.4-alpine')
    .withCommand(['redis-server', '--maxmemory', '256mb', '--maxmemory-policy', 'allkeys-lru'])
    .withExposedPorts(REDIS_PORT)
    .withStartupTimeout(SETUP_TIMEOUT_MS)
    .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
    .start();

const applyE2EEnvironment = (
  postgresContainer: StartedTestContainer,
  redisContainer: StartedTestContainer,
): void => {
  const postgresHost = postgresContainer.getHost();
  const postgresPort = String(postgresContainer.getMappedPort(POSTGRES_PORT));
  const redisHost = redisContainer.getHost();
  const redisPort = String(redisContainer.getMappedPort(REDIS_PORT));

  Object.assign(process.env, {
    API_EXTERNAL_BASE_URL: 'http://127.0.0.1:1337',
    APP_ENV: 'test',
    APP_HOST: '127.0.0.1',
    APP_NAME: 'NestJS Starter Kit E2E',
    APP_PORT: '1337',
    APP_TRUST_PROXY: 'false',
    DATABASE_HOST: postgresHost,
    DATABASE_LOGGING: 'false',
    DATABASE_MIGRATIONS_RUN: 'false',
    DATABASE_NAME,
    DATABASE_PASSWORD,
    DATABASE_PORT: postgresPort,
    DATABASE_SYNCHRONIZE: 'false',
    DATABASE_USER,
    JWT_EXPIRES_IN: '15m',
    JWT_ISSUER: 'nestjs-starter-kit-e2e',
    JWT_REFRESH_EXPIRES_IN: '7d',
    /**
     * Generated per run rather than written down. A literal here is indistinguishable
     * from a real leaked credential to a secret scanner — gitleaks flagged exactly this
     * line as a generic-api-key finding — and silencing that with an allowlist trains the
     * scanner to stay quiet about the file that would matter most. Nothing outside this
     * process needs the value: the same run signs and verifies every token.
     */
    JWT_SECRET: randomUUID(),
    MAIL_FROM: 'noreply@example.test',
    MAIL_HOST: '127.0.0.1',
    MAIL_PASSWORD: '',
    MAIL_PORT: '2525',
    MAIL_USERNAME: '',
    METRICS_API_KEY: `${randomUUID()}${randomUUID()}`,
    OTEL_ENABLED: 'false',
    OTEL_METRICS_ENABLED: 'false',
    QUEUE_REDIS_HOST: redisHost,
    QUEUE_REDIS_PASSWORD: '',
    QUEUE_REDIS_PORT: redisPort,
    REDIS_HOST: redisHost,
    REDIS_PASSWORD: '',
    REDIS_PORT: redisPort,
    REDIS_USERNAME: '',
    THROTTLE_LIMIT: '1000',
    THROTTLE_TTL: '60000',
  });
};

const buildMigrationDataSource = (): DataSource => {
  const options: DataSourceOptions = {
    type: 'postgres',
    database: DATABASE_NAME,
    entities: [path.resolve(__dirname, '../src/**/*.entity{.ts,.js}')],
    extra: {
      connectionTimeoutMillis: 10_000,
    },
    host: process.env.DATABASE_HOST,
    migrations: [path.resolve(__dirname, '../src/database/postgres/migrations/*{.ts,.js}')],
    namingStrategy: new SnakeNamingStrategy(),
    password: DATABASE_PASSWORD,
    port: Number(process.env.DATABASE_PORT),
    username: DATABASE_USER,
  };

  return new DataSource(options);
};

const runMigrations = async (): Promise<void> => {
  const dataSource = buildMigrationDataSource();

  await withTimeout(dataSource.initialize(), 20_000, 'Initializing e2e migration DataSource');

  try {
    await withTimeout(dataSource.runMigrations(), 30_000, 'Running e2e migrations');
  } finally {
    if (dataSource.isInitialized) {
      await withTimeout(dataSource.destroy(), 10_000, 'Destroying e2e migration DataSource');
    }
  }
};

export default async function globalSetup(): Promise<void> {
  let postgresContainer: StartedTestContainer | undefined;
  let redisContainer: StartedTestContainer | undefined;

  try {
    postgresContainer = await startPostgresContainer();
    redisContainer = await startRedisContainer();

    applyE2EEnvironment(postgresContainer, redisContainer);
    await runMigrations();

    setE2EContainerState({ postgresContainer, redisContainer });
  } catch (error: unknown) {
    const cleanupErrors = await stopE2EContainers({ postgresContainer, redisContainer });

    if (cleanupErrors.length > 0) {
      throw new AggregateError(
        [error, ...cleanupErrors],
        `E2E global setup failed and cleanup reported ${cleanupErrors.length} error(s).`,
      );
    }

    throw new Error(`E2E global setup failed: ${(error as Error).message}`, { cause: error });
  }
}

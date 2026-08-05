import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/bootstrap/configure-app';

/**
 * Runs the application through `configureApp`, exactly as main.ts does, so routes,
 * validation and the response envelope resolve the way they do in production.
 *
 * Requires a reachable database: importing AppModule initialises TypeORM.
 */
describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health/live returns ok without touching the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/live').expect(200);

    // The production envelope, not the handler's raw return. `health` is VERSION_NEUTRAL,
    // so it stays at /api/health/live while everything else moved under /api/v1.
    expect(response.body).toMatchObject({
      data: { status: 'ok' },
      message: 'Service is live',
      statusCode: 200,
    });
    expect((response.body as { data: { timestamp: string } }).data.timestamp).toEqual(
      expect.any(String),
    );
  });
});

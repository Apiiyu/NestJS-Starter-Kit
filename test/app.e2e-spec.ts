import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

/**
 * Mirrors the global prefix from main.ts so routes resolve the way they do in
 * production. The previous version of this file asked for `GET /` and expected
 * 'Hello World!', which is Nest's scaffold — this project has no AppController
 * and mounts everything under /api.
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
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health/live returns ok without touching the database', async () => {
    const response = await request(app.getHttpServer()).get('/api/health/live').expect(200);

    // The controller's own shape. Global interceptors are wired in main.ts and
    // are deliberately not replayed here, so the response is not wrapped.
    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });
});

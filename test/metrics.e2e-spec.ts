// Bootstrap
import { configureApp } from '../src/common/bootstrap/configure-app';

// Modules
import { AppModule } from '../src/app.module';

// NestJS Libraries
import type { INestApplication } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

// Supertest
import request from 'supertest';

describe('Metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app, AppModule);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['no API key', undefined],
    ['an invalid API key', 'not-the-right-key'],
  ])('rejects a scrape with %s', async (_label, apiKey) => {
    const pendingRequest = request(app.getHttpServer()).get('/api/v1/metrics');

    if (apiKey) {
      pendingRequest.set('x-api-key', apiKey);
    }

    const response = await pendingRequest.expect(401);

    expect(response.body).toMatchObject({
      data: null,
      path: '/api/v1/metrics',
      statusCode: 401,
    });
  });

  it('returns raw Prometheus text to an authenticated scraper', async () => {
    const apiKey = process.env.METRICS_API_KEY;

    if (!apiKey) {
      throw new Error('METRICS_API_KEY was not configured by e2e global setup.');
    }

    const response = await request(app.getHttpServer())
      .get('/api/v1/metrics')
      .set('x-api-key', apiKey)
      .expect(200)
      .expect('Content-Type', /text\/plain/);

    expect(response.text).toContain('# HELP process_cpu_user_seconds_total');
    expect(response.text).not.toContain('"statusCode"');
  });
});

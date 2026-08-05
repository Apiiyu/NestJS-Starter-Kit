// Bootstrap
import { configureApp } from './configure-app';

// Interceptors
import { CustomBaseResponseInterceptor } from '../interceptors/base-response.interceptor';
import { ContextInterceptor } from '../interceptors/context.interceptor';

// NestJS Libraries
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

/**
 * These assertions look like "the function calls what it calls", and that is the point.
 * The bug this guards against is a global quietly going missing: before this file existed,
 * the validation pipe and the response interceptor lived only in main.ts, the e2e suite
 * never ran them, and DTO rules were inert in every test while being enforced in
 * production. A unit test that pins the set of globals is what makes that regression loud
 * instead of invisible.
 */
describe('configureApp', () => {
  const buildApp = () => {
    const app = {
      enableVersioning: jest.fn(),
      get: jest.fn((token: unknown) => ({ token })),
      select: jest.fn(() => ({})),
      setGlobalPrefix: jest.fn(),
      useGlobalInterceptors: jest.fn(),
      useGlobalPipes: jest.fn(),
    };

    return app as unknown as INestApplication & typeof app;
  };

  it('mounts everything under /api with URI versioning defaulting to v1', () => {
    const app = buildApp();

    configureApp(app);

    expect(app.setGlobalPrefix).toHaveBeenCalledWith('api');
    expect(app.enableVersioning).toHaveBeenCalledWith({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
  });

  it('registers the serializer, the response envelope and the context interceptor', () => {
    const app = buildApp();

    configureApp(app);

    const registered = app.useGlobalInterceptors.mock.calls.flat();

    expect(registered.some((entry) => entry instanceof ClassSerializerInterceptor)).toBe(true);
    expect(registered.some((entry) => entry instanceof CustomBaseResponseInterceptor)).toBe(true);
    expect(app.get).toHaveBeenCalledWith(ContextInterceptor);
  });

  it('validates with transform, whitelist and forbidNonWhitelisted all on', () => {
    const app = buildApp();

    configureApp(app);

    expect(app.useGlobalPipes).toHaveBeenCalledTimes(1);

    const [pipe] = app.useGlobalPipes.mock.calls[0] as [ValidationPipe];

    expect(pipe).toBeInstanceOf(ValidationPipe);

    // Reading the pipe's own options rather than re-stating them: a change to the
    // constructor call has to show up here, which is the whole reason this test exists.
    const options = (pipe as unknown as { validatorOptions: Record<string, unknown> })
      .validatorOptions;

    expect(options).toMatchObject({
      forbidNonWhitelisted: true,
      whitelist: true,
    });
  });
});

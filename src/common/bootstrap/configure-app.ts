// Class Validator
import { useContainer } from 'class-validator';

// Interceptors
import { CustomBaseResponseInterceptor } from '../interceptors/base-response.interceptor';
import { ContextInterceptor } from '../interceptors/context.interceptor';

// NestJS Libraries
import { ClassSerializerInterceptor, ValidationPipe, VersioningType } from '@nestjs/common';
import type { INestApplication, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * @description Apply every global that changes how a request is parsed or a response is
 * shaped.
 *
 * This exists because `main.ts` used to own all of it, and `main.ts` is the one file an
 * e2e suite never runs. `Test.createTestingModule({ imports: [AppModule] })` builds an
 * application from the module-level providers only — AppModule registers APP_FILTER and
 * APP_GUARD, so those were present, but the validation pipe, the response interceptor and
 * URI versioning were not. The e2e suite was therefore exercising a different application
 * than the one that gets deployed:
 *
 * - No ValidationPipe, so every DTO rule was inert. Registering with a one-character
 *   password returned 201 under test and 400 in production.
 * - No CustomBaseResponseInterceptor, so a handler's raw `{ message, result }` reached the
 *   assertions. Production wraps that into `{ statusCode, message, data }`, a shape the
 *   suite had never once seen.
 * - No versioning, so the suite called `/api/...` while the deployed routes live under
 *   `/api/v1/...`.
 *
 * Both entry points share this from now on, so the two cannot drift apart again. What
 * stays in `main.ts` is only what a test has no use for: the listener, CORS, helmet,
 * compression, shutdown hooks and Swagger.
 */
export const configureApp = (app: INestApplication, containerModule: Type<unknown>): void => {
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new CustomBaseResponseInterceptor());
  app.useGlobalInterceptors(app.get(ContextInterceptor));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  /**
   * Lets custom class-validator constraints resolve their dependencies from the Nest
   * container. https://dev.to/avantar/custom-validation-with-database-in-nestjs-gao
   *
   * The module is a parameter rather than an import of AppModule. Importing it here drags
   * the whole application graph — and therefore environment validation — into anything
   * that so much as imports this file, which is how the unit spec ended up failing in CI
   * with "APP_ENV is required" while passing locally off a developer's .env.
   */
  useContainer(app.select(containerModule), { fallbackOnErrors: true });
};

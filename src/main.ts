import './instrumentation';

// Class Validator
import { useContainer } from 'class-validator';

// Compression
import compression from 'compression';

// Helmet
import helmet from 'helmet';

// Interceptors
import { CustomBaseResponseInterceptor } from './common/interceptors/base-response.interceptor';
import { ContextInterceptor } from './common/interceptors/context.interceptor';

// Modules
import { AppModule } from './app.module';

// NestJS Libraries
import { ClassSerializerInterceptor, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

// Pino
import { Logger as PinoLogger } from 'nestjs-pino';

// Services
import { AppConfigurationsService } from './configurations/app/app-configuration.service';

// Setups
import { swaggerSetup } from './configurations/swagger/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  const logger = new Logger('Bootstrap');

  // Get app config for cors settings and starting the app.
  const appConfigurations: AppConfigurationsService = app.get(AppConfigurationsService);

  /**
   * Global Prefix
   */
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.enableShutdownHooks();

  if (appConfigurations.trustProxy) {
    app.set('trust proxy', 1);
  }

  /**
   * Set Swagger
   */
  swaggerSetup(app, appConfigurations);

  /**
   * Security headers.
   *
   * This replaces seven hand-maintained `setHeader` calls. Hand-rolling them means
   * the list only ever gains a header when somebody remembers to add it; helmet
   * tracks the current recommendations as a dependency instead.
   *
   * `frameguard` is set to SAMEORIGIN rather than helmet's DENY default to preserve
   * the previous behaviour. CSP is left off because helmet's default policy blocks
   * the inline scripts Swagger UI serves from `/docs`, which would silently break
   * the API explorer; turn it on per-route once the docs route is carved out.
   */
  app.use(
    helmet({
      contentSecurityPolicy: false,
      frameguard: { action: 'sameorigin' },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  /**
   * Global Serializer
   */
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  app.useGlobalInterceptors(new CustomBaseResponseInterceptor());
  app.useGlobalInterceptors(app.get(ContextInterceptor));

  /**
   * Global Validation
   */
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
   * https://dev.to/avantar/custom-validation-with-database-in-nestjs-gao
   */
  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  /**
   * Enable Compression
   * Compression can greatly decrease the size of the response body, thereby increasing the speed of a web app.
   * https://docs.nestjs.com/techniques/compression
   */
  app.use(compression());

  /**
   * Enable Cors
   */
  app.enableCors({
    origin: appConfigurations.corsOrigins.length > 0 ? appConfigurations.corsOrigins : true,
    credentials: true,
  });

  await app.listen(appConfigurations.appPort, appConfigurations.appHost, () => {
    logger.log(
      `[${appConfigurations.appName} ${appConfigurations.appEnv}] Server running at http://${appConfigurations.appHost}:${appConfigurations.appPort}`,
    );
  });
}
void bootstrap();

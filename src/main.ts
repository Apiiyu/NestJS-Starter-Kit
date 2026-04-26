import './instrumentation';

// Class Validator
import { useContainer } from 'class-validator';

// Compression
import compression from 'compression';

// Interceptors
import { CustomBaseResponseInterceptor } from './common/interceptors/base-response.interceptor';
import { ContextInterceptor } from './common/interceptors/context.interceptor';

// Modules
import { AppModule } from './app.module';

// NestJS Libraries
import { ClassSerializerInterceptor, Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

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

  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-DNS-Prefetch-Control', 'off');
    response.setHeader('X-Download-Options', 'noopen');
    response.setHeader('X-Frame-Options', 'SAMEORIGIN');
    response.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    response.setHeader('X-XSS-Protection', '0');

    next();
  });

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

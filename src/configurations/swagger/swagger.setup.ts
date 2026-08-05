// NestJS Libraries
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import type { INestApplication } from '@nestjs/common';

// Services
import type { AppConfigurationsService } from '../app/app-configuration.service';

export const buildOpenApiDocument = (
  app: INestApplication,
  appConfiguration: AppConfigurationsService,
): OpenAPIObject => {
  /**
   * Swagger Config
   * https://docs.nestjs.com/openapi/introduction
   */
  const documentBuilder = new DocumentBuilder()
    .setTitle(appConfiguration.appName)
    .setDescription('List of API(s)')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Health', 'Liveness and readiness probes')
    .addTag('Authentication', 'Registration, sessions, and identity')
    .addTag('Users', 'Authenticated user administration');

  if (appConfiguration.apiExternalBaseUrl.length > 0) {
    documentBuilder.addServer(appConfiguration.apiExternalBaseUrl);
  }

  const configurationOfDocument = documentBuilder.build();

  return SwaggerModule.createDocument(app, configurationOfDocument);
};

export const swaggerSetup = (app: INestApplication, appConfiguration: AppConfigurationsService) => {
  const document = buildOpenApiDocument(app, appConfiguration);
  SwaggerModule.setup('docs', app, document);
};

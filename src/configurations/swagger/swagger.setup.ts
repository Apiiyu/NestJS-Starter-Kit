// NestJS Libraries
import type { INestApplication } from '@nestjs/common';

// Services
import type { AppConfigurationsService } from '../app/app-configuration.service';

// Swagger
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

/**
 * @description Builds the OpenAPI document from the running application's metadata.
 *
 * Separate from `swaggerSetup` because the document has two consumers: the `/docs` UI, and
 * `bun run sdk:build`, which emits it to a file and generates a client from it. Both must get
 * the identical document, so the build step cannot be allowed to construct its own.
 *
 * @param app The application whose controllers and DTOs are reflected over.
 * @param appConfiguration Supplies the title, description, and version of the document.
 */
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

/**
 * @description Mounts the Swagger UI at `/docs`.
 *
 * @param app The application to mount the explorer on.
 * @param appConfiguration Supplies the document metadata.
 */
export const swaggerSetup = (app: INestApplication, appConfiguration: AppConfigurationsService) => {
  const document = buildOpenApiDocument(app, appConfiguration);
  SwaggerModule.setup('docs', app, document);
};

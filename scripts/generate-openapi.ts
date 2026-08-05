// Node.js
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

// Bootstrap
import { configureApp } from '../src/common/bootstrap/configure-app';

// Modules
import { AppModule } from '../src/app.module';

// NestJS Libraries
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// Services
import { AppConfigurationsService } from '../src/configurations/app/app-configuration.service';

// Swagger
import { buildOpenApiDocument } from '../src/configurations/swagger/swagger.setup';

const OUTPUT_DIRECTORY = path.resolve(import.meta.dirname, '../artifacts');
const OUTPUT_FILE = path.join(OUTPUT_DIRECTORY, 'openapi.json');

const generateOpenApi = async (): Promise<void> => {
  let app: INestApplication | undefined;

  try {
    app = await NestFactory.create(AppModule, { abortOnError: false, logger: false });
    configureApp(app, AppModule);
    await app.init();

    const appConfiguration = app.get(AppConfigurationsService);
    const document = buildOpenApiDocument(app, appConfiguration);

    await mkdir(OUTPUT_DIRECTORY, { recursive: true });
    await writeFile(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    process.stdout.write(`Generated ${path.relative(process.cwd(), OUTPUT_FILE)}\n`);
  } finally {
    await app?.close();
  }
};

await generateOpenApi();

import { Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApiProperty, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';

import { ApiBaseArrayResponse } from './api-base-array-response.decorator';

interface IArraySchema {
  items?: unknown;
  type?: string;
}

interface IComposedResponseSchema {
  allOf?: Array<{
    $ref?: string;
    properties?: { data?: IArraySchema };
  }>;
}

interface IOpenApiResponse {
  content?: Record<string, { schema?: IComposedResponseSchema }>;
}

class ItemResponse {
  @ApiProperty()
  id!: string;
}

@Controller('items')
class ItemsController {
  @Get()
  @ApiBaseArrayResponse(ItemResponse)
  findAll(): ItemResponse[] {
    return [];
  }
}

describe('ApiBaseArrayResponse', () => {
  it('defines items for every array schema in the generated OpenAPI response', async () => {
    const moduleReference = await Test.createTestingModule({
      controllers: [ItemsController],
    }).compile();
    const app = moduleReference.createNestApplication();

    try {
      await app.init();
      const document: OpenAPIObject = SwaggerModule.createDocument(app, {
        openapi: '3.0.0',
        info: { title: 'test', version: '1.0.0' },
      });
      const response = document.paths['/items']?.get?.responses?.['200'] as
        IOpenApiResponse | undefined;

      expect(response).toBeDefined();
      const schema = response?.content?.['application/json']?.schema;
      const composedSchemas = schema?.allOf ?? [];
      const arraySchemas = composedSchemas.flatMap((part) => {
        const data = part.properties?.data;
        return data?.type === 'array' ? [data] : [];
      });

      expect(arraySchemas.length).toBeGreaterThan(0);
      expect(arraySchemas.every((arraySchema) => arraySchema.items !== undefined)).toBe(true);
    } finally {
      await app.close();
    }
  });
});

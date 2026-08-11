// NestJS Libraries
import { applyDecorators } from '@nestjs/common';
import type { Type } from '@nestjs/common';

// Swagger
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * @description Documents a 200 response whose payload is an array of `model`, wrapped in the
 * shared envelope.
 *
 * The array counterpart to `ApiBaseResponse`, and separate for the same reason: Swagger cannot
 * infer the envelope an interceptor adds at runtime.
 *
 * @param model The class describing each element under `data`.
 */
export const ApiBaseArrayResponse = <TModel extends Type<unknown>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Successfully received list of data',
      schema: {
        allOf: [
          {
            type: 'object',
            properties: {
              statusCode: {
                type: 'number',
              },
              message: {
                type: 'string',
              },
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};

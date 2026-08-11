// NestJS Libraries
import { applyDecorators } from '@nestjs/common';
import type { Type } from '@nestjs/common';

// Swagger
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * @description Documents a 200 response whose payload is a single instance of `model`, wrapped
 * in the shared envelope.
 *
 * Needed because the envelope is applied by an interceptor, which Swagger cannot see. Without
 * this the generated contract would promise the bare model and every client generated from it
 * would fail to find its fields one level down under `data`.
 *
 * @param model The class describing the payload under `data`.
 */
export const ApiBaseResponse = <TModel extends Type<unknown>>(model: TModel) => {
  return applyDecorators(
    ApiExtraModels(model),
    ApiOkResponse({
      description: 'Successfully received a data',
      schema: {
        allOf: [
          {
            properties: {
              statusCode: {
                type: 'number',
              },
              message: {
                type: 'string',
              },
              data: {
                type: 'object',
              },
            },
          },
          {
            properties: {
              data: {
                type: 'object',
                items: { $ref: getSchemaPath(model) },
              },
            },
          },
        ],
      },
    }),
  );
};

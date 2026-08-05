// NestJS Libraries
import { Module } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { IncomingHttpHeaders } from 'http';

// Telemetry
import { getActiveTraceIdentifiers } from '../../common/telemetry/trace-context.helper';

// Pino
import { LoggerModule } from 'nestjs-pino';

type RequestIdentifierSource = {
  headers: IncomingHttpHeaders;
  id?: unknown;
  requestId?: unknown;
};

/**
 * Takes the header value rather than the header bag plus a name to look up in it, so the
 * call site uses a literal key. See the matching helper in request-context.middleware.ts.
 */
const firstHeaderValue = (headerValue: IncomingHttpHeaders[string]): string | undefined => {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
};

const resolveRequestId = (request: RequestIdentifierSource): string => {
  if (typeof request.requestId === 'string' && request.requestId.length > 0) {
    return request.requestId;
  }

  if (typeof request.id === 'string' && request.id.length > 0) {
    return request.id;
  }

  if (typeof request.id === 'number') {
    return String(request.id);
  }

  return firstHeaderValue(request.headers['x-request-id']) ?? randomUUID();
};

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (request, response): string => {
          const requestId = resolveRequestId(request);
          response.setHeader('x-request-id', requestId);

          return requestId;
        },
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        level: process.env.NODE_ENV !== 'production' ? 'debug' : 'info',
        redact: ['req.headers.authorization', 'req.headers.x-api-key', 'req.body.password'],
        customProps: (request) => ({
          correlationId:
            firstHeaderValue(request.headers['x-correlation-id']) ?? resolveRequestId(request),
          requestId: resolveRequestId(request),
          ...getActiveTraceIdentifiers(),
        }),
      },
    }),
  ],
})
export class AppLoggerModule {}

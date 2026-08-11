// Helpers
import { getActiveTraceIdentifiers } from '../../common/telemetry/trace-context.helper';

// NestJS Libraries
import { Module } from '@nestjs/common';

// Pino
import { LoggerModule } from 'nestjs-pino';

// Third Party Libraries
import { randomUUID } from 'crypto';
import type { IncomingHttpHeaders } from 'http';

/**
 * @description The parts of a request `resolveRequestId` looks at.
 *
 * Structural rather than Express's `Request` because the three candidate fields come from three
 * different places — this application's middleware, pino-http's own generator, and the incoming
 * header — and none of them is on the framework's type.
 */
type RequestIdentifierSource = {
  headers: IncomingHttpHeaders;
  id?: unknown;
  requestId?: unknown;
};

/**
 * @description Reduces a possibly-repeated header to its first value.
 *
 * Takes the header value rather than the header bag plus a name to look up in it, so the
 * call site uses a literal key. See the matching helper in request-context.middleware.ts.
 */
const firstHeaderValue = (headerValue: IncomingHttpHeaders[string]): string | undefined => {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
};

/**
 * @description Settles on one request ID, in order of preference: the one this application's
 * middleware set, pino-http's own, the inbound `x-request-id` header, then a fresh UUID.
 *
 * The order matters. The middleware's value is the one already written into the async context
 * and therefore into every application log line, so preferring anything else here would make
 * the access log and the application logs disagree about the same request.
 */
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

/**
 * @description Configures Pino as the application logger, correlated with request IDs and OTel
 * trace context.
 *
 * The redaction list is the part to be careful with: `req.headers.x-api-key` must stay on it,
 * or every scrape writes a live credential into the access log.
 */
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

// Express
import type { NextFunction, Request, Response } from 'express';

// NestJS Libraries
import { Injectable, type NestMiddleware } from '@nestjs/common';

// OpenTelemetry
import { trace } from '@opentelemetry/api';

// Services
import { RequestContextService } from './request-context.service';

// Third Party Libraries
import { randomUUID } from 'crypto';
import type { IncomingHttpHeaders } from 'http';

/**
 * @description An Express request plus the identifier fields this middleware reads and writes.
 */
type RequestWithContext = Request & {
  correlationId?: string;
  id?: string;
  requestId?: string;
};

/**
 * @description Reduces a possibly-repeated header to its first value.
 *
 * Takes the header value rather than the header bag plus a name to look up in it. A
 * repeated header arrives as an array and only the first entry is meaningful here; that
 * is the whole job. Doing the lookup inside meant every call site indexed the bag with a
 * variable — a wider contract than this needs, and indistinguishable to a reader or a
 * linter from indexing an object with untrusted input.
 */
const firstHeaderValue = (headerValue: IncomingHttpHeaders[string]): string | undefined => {
  if (Array.isArray(headerValue)) {
    return headerValue[0];
  }

  return headerValue;
};

/**
 * @description Opens the per-request context and stamps the request and correlation IDs onto
 * it, before anything else in the pipeline runs.
 *
 * Middleware rather than an interceptor on purpose: middleware runs before guards, so a request
 * rejected by authentication is still logged with an ID and remains traceable. An interceptor
 * would only see requests that had already been let through.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly _requestContextService: RequestContextService) {}

  /**
   * @description Resolves the identifiers, publishes them on the response headers and the
   * active span, then runs the rest of the pipeline inside the new context.
   *
   * @param request The incoming request, read for existing identifiers.
   * @param response The outgoing response, which receives the request ID header.
   * @param next The remainder of the pipeline, invoked inside the context.
   */
  use(request: RequestWithContext, response: Response, next: NextFunction): void {
    const requestId =
      request.requestId ??
      request.id ??
      firstHeaderValue(request.headers['x-request-id']) ??
      randomUUID();
    const correlationId = firstHeaderValue(request.headers['x-correlation-id']) ?? requestId;

    request.requestId = requestId;
    request.correlationId = correlationId;

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);

    trace.getActiveSpan()?.setAttributes({
      'app.correlation_id': correlationId,
      'app.request_id': requestId,
    });

    this._requestContextService.run(
      {
        correlationId,
        method: request.method,
        path: request.originalUrl ?? request.url,
        requestId,
      },
      next,
    );
  }
}

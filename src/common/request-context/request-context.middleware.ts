import { randomUUID } from 'crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'http';
import type { NextFunction, Request, Response } from 'express';
import { trace } from '@opentelemetry/api';
import { RequestContextService } from './request-context.service';

type RequestWithContext = Request & {
  correlationId?: string;
  id?: string;
  requestId?: string;
};

/**
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

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly _requestContextService: RequestContextService) {}

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

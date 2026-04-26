import { randomUUID } from 'crypto';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { IncomingHttpHeaders } from 'http';
import type { NextFunction, Request, Response } from 'express';
import { RequestContextService } from './request-context.service';

type RequestWithContext = Request & {
  correlationId?: string;
  id?: string;
  requestId?: string;
};

const getHeaderValue = (headers: IncomingHttpHeaders, headerName: string): string | undefined => {
  const headerValue = headers[headerName];

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
      getHeaderValue(request.headers, 'x-request-id') ??
      randomUUID();
    const correlationId = getHeaderValue(request.headers, 'x-correlation-id') ?? requestId;

    request.requestId = requestId;
    request.correlationId = correlationId;

    response.setHeader('x-request-id', requestId);
    response.setHeader('x-correlation-id', correlationId);

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

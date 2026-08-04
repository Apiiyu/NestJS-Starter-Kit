// NestJS Libraries
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

// RxJS
import { Observable } from 'rxjs';
import { RequestContextService } from '../request-context/request-context.service';

export type RequestContextPayload = {
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

type HttpRequest = {
  context?: RequestContextPayload;
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

/**
 * https://stackoverflow.com/questions/55481224/nestjs-how-to-access-both-body-and-param-in-custom-validator
 * Injects request data into the context, so that custom validators can reach
 * params and query alongside the body.
 *
 * The context lives on the request object rather than inside `request.body`.
 * Writing it into the body put it in front of the global ValidationPipe, which
 * runs with `forbidNonWhitelisted: true` (main.ts) and rejected every payload
 * with "property context should not exist" — that failed all POST/PUT/PATCH
 * routes. Body assignment also crashed on GET, where Express leaves body
 * undefined. Custom validators read it via `args.object` or the execution
 * context; nothing consumes it yet.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly _requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    this._requestContextService.setUser(request.user);

    request.context = {
      correlationId: request.correlationId ?? this._requestContextService.correlationId,
      params: request.params,
      query: request.query,
      requestId: request.requestId ?? this._requestContextService.requestId,
      user: request.user ?? this._requestContextService.getUser(),
    };

    return next.handle();
  }
}

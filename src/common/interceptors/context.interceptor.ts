// Interfaces
import type { HttpRequest } from '../interfaces/request-context.interface';

// NestJS Libraries
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

// RxJS
import { Observable } from 'rxjs';

// Services
import { RequestContextService } from '../request-context/request-context.service';

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
/**
 * @description Publishes the request's params, query, and identifiers onto `request.context`,
 * so custom class-validator constraints can reach values outside the body they are validating.
 *
 * The context is attached to the request object rather than written into `request.body`.
 * Putting it in the body placed it in front of the global `ValidationPipe`, which runs with
 * `forbidNonWhitelisted: true` and rejected every payload with "property context should not
 * exist" — failing all POST, PUT, and PATCH routes. Body assignment also crashed on GET, where
 * Express leaves the body undefined.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly _requestContextService: RequestContextService) {}

  /**
   * @description Copies the request's params, query, identifiers, and user onto
   * `request.context` before the handler runs.
   *
   * @param context The execution context, read for the request object.
   * @param next The handler to continue to.
   */
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

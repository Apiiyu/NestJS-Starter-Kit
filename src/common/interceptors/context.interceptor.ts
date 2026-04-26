// NestJS Libraries
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';

// RxJS
import { Observable } from 'rxjs';
import { RequestContextService } from '../request-context/request-context.service';

type HttpRequest = {
  body: Record<string, unknown>;
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

/**
 * https://stackoverflow.com/questions/55481224/nestjs-how-to-access-both-body-and-param-in-custom-validator
 * Injects request data into the context, so that the ValidationPipe can use it.
 */
@Injectable()
export class ContextInterceptor implements NestInterceptor {
  constructor(private readonly _requestContextService: RequestContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<HttpRequest>();
    this._requestContextService.setUser(request.user);

    request.body['context'] = {
      correlationId: request.correlationId ?? this._requestContextService.correlationId,
      params: request.params,
      query: request.query,
      requestId: request.requestId ?? this._requestContextService.requestId,
      user: request.user ?? this._requestContextService.getUser(),
    };

    return next.handle();
  }
}

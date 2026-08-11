// Middlewares
import { RequestContextMiddleware } from './request-context.middleware';

// NestJS Libraries
import { Global, Module } from '@nestjs/common';

// Services
import { RequestContextService } from './request-context.service';

/**
 * @description Provides the per-request context store and the middleware that populates it.
 *
 * Both are exported because the two halves are used in different places: `AppModule` applies
 * the middleware, while services read the store to attach a request ID to logs and errors
 * without threading it through every function signature.
 */
@Global()
@Module({
  providers: [RequestContextMiddleware, RequestContextService],
  exports: [RequestContextMiddleware, RequestContextService],
})
export class RequestContextModule {}

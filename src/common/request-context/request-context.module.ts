import { Global, Module } from '@nestjs/common';
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

@Global()
@Module({
  providers: [RequestContextMiddleware, RequestContextService],
  exports: [RequestContextMiddleware, RequestContextService],
})
export class RequestContextModule {}

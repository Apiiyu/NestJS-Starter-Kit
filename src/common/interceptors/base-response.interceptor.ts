// DTOs
import { BaseResponseDto } from '../dtos/base-response.dto';

// Interfaces
import type { HandlerResponse } from '../interfaces/response.interface';

// NestJS Libraries
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';

// RxJS
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * @description Wraps whatever a controller returns into the single success envelope every
 * client parses, so no handler has to build `{ statusCode, message, data }` by hand.
 *
 * `StreamableFile` and falsy values pass through untouched: a file download has its own
 * response semantics, and wrapping it would corrupt the body.
 */
@Injectable()
export class CustomBaseResponseInterceptor<T> implements NestInterceptor<
  T,
  BaseResponseDto<T> | StreamableFile
> {
  /**
   * @description Maps the handler's return value into the response envelope.
   *
   * @param context The execution context, read for the HTTP status Nest already resolved.
   * @param next The handler whose stream is being transformed.
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T> | StreamableFile> {
    return next.handle().pipe(
      map((data: unknown): BaseResponseDto<T> | StreamableFile => {
        if (data instanceof StreamableFile || !data) {
          return data as StreamableFile;
        }

        const response = data as HandlerResponse<T>;
        const httpStatus = context.switchToHttp().getResponse<{ statusCode: number }>().statusCode;

        return new BaseResponseDto<T>({
          statusCode: response.statusCode ?? httpStatus,
          message: response.message ?? '',
          data: response.result,
        });
      }),
    );
  }
}

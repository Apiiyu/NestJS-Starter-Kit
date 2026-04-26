// DTOs
import { BaseResponseDto } from '../dtos/base-response.dto';

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

type HandlerResponse<T> = { statusCode?: number; message?: string; result: T };

@Injectable()
export class CustomBaseResponseInterceptor<T> implements NestInterceptor<
  T,
  BaseResponseDto<T> | StreamableFile
> {
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

// Constants
import { ERROR_CODE, ERROR_CODE_BY_STATUS } from '../constants/error-code.constant';

// Express
import type { Request, Response } from 'express';

// Interfaces
import type { IErrorResponse } from '../interfaces/response.interface';

// NestJS Libraries
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';

// Services
import { RequestContextService } from '../request-context/request-context.service';

/**
 * @description Catches everything thrown out of a request — `HttpException` and
 * plain `Error` alike — and renders it in the single error contract above.
 *
 * `@Catch()` with no argument is the whole point: an uncaught `TypeError` deep in a
 * service would otherwise bypass any narrower filter and leak Nest's default body,
 * which is exactly the inconsistency this class exists to remove.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly _logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly _requestContextService: RequestContextService) {}

  /**
   * @description Pull the client-facing message out of an exception body.
   *
   * `ValidationPipe` throws a `BadRequestException` whose body carries `message` as
   * an array of per-field failures. Those are joined rather than dropped — losing
   * them is what makes a 400 undebuggable from the client side.
   */
  private _extractMessage(exception: unknown, status: number): string {
    if (!(exception instanceof HttpException)) {
      return 'Internal server error';
    }

    const body = exception.getResponse();

    if (typeof body === 'string') {
      return body;
    }

    const { message } = body as { message?: string | string[] };

    if (Array.isArray(message)) {
      return message.join(', ');
    }

    return message ?? exception.message ?? `Request failed with status ${status}`;
  }

  /**
   * @description Resolve the stable error code for an exception.
   *
   * An exception may carry its own `errorCode` in its response body; that always
   * wins. Otherwise fall back to the status-based default, and finally to
   * `INTERNAL_ERROR` — whose presence in logs flags a throwable that deserves a
   * code of its own.
   */
  private _resolveErrorCode(exception: unknown, status: number): string {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();

      if (typeof body === 'object' && body !== null && 'errorCode' in body) {
        const { errorCode } = body as { errorCode?: unknown };

        if (typeof errorCode === 'string') {
          return errorCode;
        }
      }
    }

    return ERROR_CODE_BY_STATUS.get(status) ?? ERROR_CODE.INTERNAL_ERROR;
  }

  /**
   * @description Renders any thrown value into the single error contract and sends it.
   *
   * An unexpected error is logged with its stack but reported to the client as a generic 500 —
   * the message of a `TypeError` from deep in a service tells an attacker about internals and
   * tells a legitimate client nothing it can act on.
   *
   * @param exception Whatever was thrown: an `HttpException`, an `Error`, or neither.
   * @param host The arguments host, used to reach the request and response.
   */
  public catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: IErrorResponse = {
      statusCode: status,
      message: this._extractMessage(exception, status),
      data: null,
      errorCode: this._resolveErrorCode(exception, status),
      path: request.url,
      timestamp: new Date().toISOString(),
      requestId: this._requestContextService.requestId,
    };

    /**
     * Server faults get the stack, client faults do not. A 404 logged at error level
     * with a full trace is noise that trains people to ignore the error log, which is
     * how the one 500 that mattered gets missed.
     */
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this._logger.error(
        `${request.method} ${request.url} -> ${status} ${body.errorCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this._logger.warn(`${request.method} ${request.url} -> ${status} ${body.errorCode}`);
    }

    response.status(status).json(body);
  }
}

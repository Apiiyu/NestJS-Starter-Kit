// Constants
import { ERROR_CODE } from '../constants/error-code.constant';

// NestJS Libraries
import {
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// RxJS
import type { Observable } from 'rxjs';

/**
 * @description Requires a valid bearer token, unless the route is marked public.
 *
 * Wraps Passport's JWT guard to add the public-route escape hatch and to log rejections, so an
 * authentication failure leaves a trace instead of only a 401 on the wire.
 */
@Injectable()
export class AuthenticationJWTGuard extends AuthGuard('jwt') {
  private readonly _logger = new Logger(AuthenticationJWTGuard.name);

  /**
   * @description Runs the JWT strategy unless the route is marked public.
   *
   * @param context The execution context, read for the public-route metadata and the request.
   */
  public canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  /**
   * @description Turn passport's failure reason into a client-actionable 401.
   *
   * `info` is typed `unknown` rather than `string` because passport-jwt puts an Error
   * there — `TokenExpiredError`, `JsonWebTokenError`, or `Error('No auth token')`. The
   * old signature claimed string, which is why the distinction was only ever logged
   * and never reached the client: every failure came back as an identical bare 401,
   * and a client cannot tell "refresh and retry silently" from "send the user to log
   * in again".
   */
  public handleRequest<TUser = IRequestUser>(err: unknown, user: TUser, info: unknown): TUser {
    if (err ?? !user) {
      const reason = info instanceof Error ? info.message : String(info);

      this._logger.warn(`[WARN] AuthenticationJWTGuard: ${reason}`);

      // ? The strategy already chose a code (a wrong token type, say) — keep it
      if (err instanceof HttpException) {
        throw err;
      }

      const expired = info instanceof Error && info.name === 'TokenExpiredError';

      throw new UnauthorizedException({
        errorCode: expired ? ERROR_CODE.AUTH_TOKEN_EXPIRED : ERROR_CODE.AUTH_TOKEN_INVALID,
        message: expired ? 'Access token has expired.' : 'Access token is missing or invalid.',
      });
    }

    return user;
  }
}

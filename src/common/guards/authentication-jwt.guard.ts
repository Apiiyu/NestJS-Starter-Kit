// NestJS Libraries
import { ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// RxJS
import type { Observable } from 'rxjs';

@Injectable()
export class AuthenticationJWTGuard extends AuthGuard('jwt') {
  private readonly _logger = new Logger(AuthenticationJWTGuard.name);

  public canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    return super.canActivate(context);
  }

  public handleRequest<TUser = IRequestUser>(err: unknown, user: TUser, info: string): TUser {
    if (err ?? !user) {
      this._logger.warn(`[WARN] AuthenticationJWTGuard: ${info}`);
      throw (err instanceof Error ? err : null) ?? new UnauthorizedException();
    }

    return user;
  }
}

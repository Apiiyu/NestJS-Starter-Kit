// Constants
import { ERROR_CODE } from '../constants/error-code.constant';
import type { UserRole } from '../constants/role.constant';

// Decorators
import { ROLES_KEY } from '../decorators/roles.decorator';

// NestJS Libraries
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/**
 * @description Allows a request through only when the authenticated user holds one of the
 * roles named by `@Roles()` on the handler or its controller.
 *
 * Coarse gate only. It answers "may this kind of user call this endpoint at all", never "may
 * this user touch this particular row" — that question needs the record, so it belongs in the
 * query, not here.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly _reflector: Reflector) {}

  /**
   * @description Reads the required roles off the route metadata and compares them with the
   * user Passport attached to the request.
   *
   * A route with no `@Roles()` metadata is left open: this guard's job is to enforce a stated
   * requirement, not to invent one. Authentication itself is a separate guard.
   *
   * @param context The execution context, read for both the handler metadata and the request.
   */
  public canActivate(context: ExecutionContext): boolean {
    const required = this._reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    /**
     * No `@Roles()` anywhere on the route means no role requirement, and the guard has
     * to be transparent in that case. It is meant to be attached at controller level;
     * denying undecorated handlers would break every route that needs no role, and
     * people would go back to attaching it one route at a time and forgetting.
     */
    if (!required?.length) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user?: { role?: UserRole } }>();

    /**
     * Reaching here without a user means `RolesGuard` was applied with no authentication
     * guard in front of it. That is a wiring mistake, and denying is the safe reading:
     * allowing would turn a missing guard into an open endpoint that still looks
     * protected in the source.
     */
    if (!user?.role || !required.includes(user.role)) {
      throw new ForbiddenException({
        errorCode: ERROR_CODE.FORBIDDEN,
        message: 'You do not have permission to perform this action.',
      });
    }

    return true;
  }
}

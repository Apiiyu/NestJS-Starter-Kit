// Constants
import { ERROR_CODE } from '../constants/error-code.constant';
import { ROLES_KEY } from '../decorators/roles.decorator';

// NestJS Libraries
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Types
import type { UserRole } from '../constants/role.constant';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly _reflector: Reflector) {}

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

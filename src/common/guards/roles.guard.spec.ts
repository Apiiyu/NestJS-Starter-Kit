import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ERROR_CODE } from '../constants/error-code.constant';
import { USER_ROLE } from '../constants/role.constant';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

const contextWith = (user: unknown): ExecutionContext =>
  ({
    getClass: jest.fn(),
    getHandler: jest.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

describe('RolesGuard', () => {
  let reflector: Reflector;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const requireRoles = (roles: unknown): void => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);
  };

  it('reads the requirement from both the handler and the class', () => {
    const spy = jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = contextWith(undefined);

    guard.canActivate(context);

    expect(spy).toHaveBeenCalledWith(ROLES_KEY, [context.getHandler(), context.getClass()]);
  });

  /**
   * The guard is meant to sit on a whole controller, so it has to be transparent on
   * routes that declare no roles. Denying them would mean attaching it could only ever
   * be done route by route — which is how a handler eventually gets added without one.
   */
  it.each([
    ['no metadata at all', undefined],
    ['an empty list', []],
  ])('allows a route with %s', (_label, roles) => {
    requireRoles(roles);

    expect(guard.canActivate(contextWith({ role: USER_ROLE.USER }))).toBe(true);
  });

  it('allows a user whose role is listed', () => {
    requireRoles([USER_ROLE.ADMIN]);

    expect(guard.canActivate(contextWith({ role: USER_ROLE.ADMIN }))).toBe(true);
  });

  it('allows a user matching any one of several listed roles', () => {
    requireRoles([USER_ROLE.ADMIN, USER_ROLE.USER]);

    expect(guard.canActivate(contextWith({ role: USER_ROLE.USER }))).toBe(true);
  });

  it('denies a user whose role is not listed', () => {
    requireRoles([USER_ROLE.ADMIN]);

    expect(() => guard.canActivate(contextWith({ role: USER_ROLE.USER }))).toThrow(
      ForbiddenException,
    );
  });

  it('reports the denial with the catalogued error code', () => {
    requireRoles([USER_ROLE.ADMIN]);

    try {
      guard.canActivate(contextWith({ role: USER_ROLE.USER }));
      throw new Error('Expected the guard to deny.');
    } catch (error) {
      expect((error as ForbiddenException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.FORBIDDEN,
      });
    }
  });

  /**
   * No user on the request means no authentication guard ran first. Failing closed
   * turns that wiring mistake into a 403 instead of an open endpoint that still reads
   * as protected in the source.
   */
  it.each([
    ['no user at all', undefined],
    ['a user with no role', {}],
  ])('denies when the request carries %s', (_label, user) => {
    requireRoles([USER_ROLE.ADMIN]);

    expect(() => guard.canActivate(contextWith(user))).toThrow(ForbiddenException);
  });
});

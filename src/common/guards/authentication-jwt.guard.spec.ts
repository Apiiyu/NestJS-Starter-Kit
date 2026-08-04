import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

import { ERROR_CODE } from '../constants/error-code.constant';
import { USER_ROLE } from '../constants/role.constant';
import { AuthenticationJWTGuard } from './authentication-jwt.guard';

/** Shaped like what `jsonwebtoken` throws and passport-jwt forwards as `info`. */
const jwtError = (name: string, message: string): Error =>
  Object.assign(new Error(message), { name });

const responseOf = (error: unknown): Record<string, unknown> =>
  (error as UnauthorizedException).getResponse() as Record<string, unknown>;

const caught = (run: () => unknown): unknown => {
  try {
    run();

    throw new Error('Expected the guard to reject, but it returned.');
  } catch (error) {
    return error;
  }
};

describe('AuthenticationJWTGuard', () => {
  const guard = new AuthenticationJWTGuard();

  const user: IRequestUser = {
    email: 'test@test.com',
    id: 'user-1',
    role: USER_ROLE.USER,
    username: 'tester',
  };

  it('passes the authenticated user straight through', () => {
    expect(guard.handleRequest(null, user, undefined)).toBe(user);
  });

  /**
   * Expiry has to be distinguishable from every other failure. A client that cannot
   * tell "refresh and retry silently" from "this credential is junk" ends up doing the
   * same thing for both, and the usual choice is a logout loop.
   */
  it('maps an expired token to AUTH_TOKEN_EXPIRED', () => {
    const error = caught(() =>
      guard.handleRequest(null, null, jwtError('TokenExpiredError', 'jwt expired')),
    );

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(responseOf(error)).toMatchObject({ errorCode: ERROR_CODE.AUTH_TOKEN_EXPIRED });
  });

  it.each([
    ['a malformed token', jwtError('JsonWebTokenError', 'jwt malformed')],
    ['a missing header', jwtError('Error', 'No auth token')],
    ['no information at all', undefined],
  ])('maps %s to AUTH_TOKEN_INVALID', (_label, info) => {
    const error = caught(() => guard.handleRequest(null, null, info));

    expect(responseOf(error)).toMatchObject({ errorCode: ERROR_CODE.AUTH_TOKEN_INVALID });
  });

  /**
   * The strategy may already have made a more specific decision — a refresh token
   * presented as a Bearer credential, say. Overwriting it here would throw away the
   * only part of the answer the client can act on.
   */
  it('preserves an HttpException the strategy already chose', () => {
    const fromStrategy = new UnauthorizedException({
      errorCode: ERROR_CODE.AUTH_TOKEN_WRONG_TYPE,
      message: 'This endpoint requires an access token.',
    });

    expect(() => guard.handleRequest(fromStrategy, null, undefined)).toThrow(fromStrategy);
  });

  it('preserves a non-401 HttpException too', () => {
    const forbidden = new ForbiddenException();

    expect(() => guard.handleRequest(forbidden, null, undefined)).toThrow(forbidden);
  });

  // A plain Error is not a client-facing decision; it becomes a generic invalid token.
  it('does not leak a plain Error from passport', () => {
    const error = caught(() =>
      guard.handleRequest(new Error('database exploded'), null, undefined),
    );

    expect(error).toBeInstanceOf(UnauthorizedException);
    expect(responseOf(error)).toMatchObject({ errorCode: ERROR_CODE.AUTH_TOKEN_INVALID });
  });
});

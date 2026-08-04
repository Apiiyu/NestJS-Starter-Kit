import { UnauthorizedException } from '@nestjs/common';

import type { JwtConfigService } from '../../configurations/jwt/jwt-configuration.service';
import { ERROR_CODE } from '../constants/error-code.constant';
import { USER_ROLE } from '../constants/role.constant';
import { TOKEN_TYPE } from '../constants/token.constant';
import { JwtStrategy } from './jwt.strategy';

const jwtConfig = {
  jwtExp: '15m',
  jwtIssuer: 'nestjs-starter-kit',
  jwtRefreshExp: '7d',
  jwtSecret: 'test-secret',
} as JwtConfigService;

const payload = (overrides: Partial<IValidateJWTStrategy> = {}): IValidateJWTStrategy => ({
  email: 'test@test.com',
  jti: 'token-1',
  role: USER_ROLE.USER,
  sub: 'user-1',
  type: TOKEN_TYPE.ACCESS,
  username: 'tester',
  ...overrides,
});

describe('JwtStrategy', () => {
  const strategy = new JwtStrategy(jwtConfig);

  it('maps an access token payload onto the request user', () => {
    expect(strategy.validate(payload())).toEqual({
      email: 'test@test.com',
      id: 'user-1',
      role: USER_ROLE.USER,
      username: 'tester',
    });
  });

  it('carries the role through so authorisation needs no database read', () => {
    expect(strategy.validate(payload({ role: USER_ROLE.ADMIN }))).toMatchObject({
      role: USER_ROLE.ADMIN,
    });
  });

  /**
   * The signature has already been accepted by the time `validate` runs — access and
   * refresh tokens share a secret, so cryptography cannot separate them. Without this
   * check a stolen refresh token works as a Bearer credential for its full seven days,
   * and the short access TTL buys nothing.
   */
  it('rejects a refresh token presented as an access token', () => {
    expect(() => strategy.validate(payload({ type: TOKEN_TYPE.REFRESH }))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a payload with no type claim at all', () => {
    expect(() =>
      strategy.validate(payload({ type: undefined as unknown as IValidateJWTStrategy['type'] })),
    ).toThrow(UnauthorizedException);
  });

  it('reports the wrong type with its own error code', () => {
    try {
      strategy.validate(payload({ type: TOKEN_TYPE.REFRESH }));
      throw new Error('Expected the strategy to reject.');
    } catch (error) {
      expect((error as UnauthorizedException).getResponse()).toMatchObject({
        errorCode: ERROR_CODE.AUTH_TOKEN_WRONG_TYPE,
      });
    }
  });
});

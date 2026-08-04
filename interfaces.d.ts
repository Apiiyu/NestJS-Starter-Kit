import type { TokenType } from './src/common/constants/token.constant';
import type { UserRole } from './src/common/constants/role.constant';

export {};

/**
 * @description Here's a way to extend the global interfaces.
 */
declare global {
  interface IRequestUser {
    id: string;
    email: string;
    username: string;
    role: UserRole;
  }

  interface IResultFilter<T = Record<string, unknown>> {
    data: T[];
    total: number;
    totalData: number;
  }

  interface IConstructBaseResponse<T> {
    statusCode: number;
    message: string;
    data: T;
  }

  interface IConstructPageMeta {
    page: number;
    size: number;
    total: number;
    totalData: number;
  }

  interface ICustomRequestHeaders extends Request {
    user: IRequestUser;
  }

  /**
   * The claim set this application signs and verifies.
   *
   * `jti` makes a token nameable, which is what makes it revocable — logout and
   * refresh-reuse detection both work by recording an id, and neither is possible
   * against an anonymous token. `type` keeps a refresh token from being spent as an
   * access token, since both are signed with the same secret and are otherwise
   * indistinguishable. `role` is carried so authorisation costs no database round
   * trip, at the price of staleness bounded by the access token's lifetime.
   */
  interface IValidateJWTStrategy {
    sub: string;
    username: string;
    email: string;
    jti: string;
    type: TokenType;
    role: UserRole;
  }
}

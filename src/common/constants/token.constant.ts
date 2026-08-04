/**
 * @description What a signed token is allowed to be used for.
 *
 * Access and refresh tokens are signed with the same secret, so cryptographic
 * verification alone cannot tell them apart: a 7-day refresh token presented as a
 * Bearer credential verifies perfectly and would grant API access for its whole
 * lifetime, which is precisely what a 15-minute access TTL exists to prevent.
 *
 * The `type` claim closes that gap. `JwtStrategy` rejects anything that is not
 * `access`, and the refresh endpoint rejects anything that is not `refresh`.
 */
export const TOKEN_TYPE = {
  ACCESS: 'access',
  REFRESH: 'refresh',
} as const;

export type TokenType = (typeof TOKEN_TYPE)[keyof typeof TOKEN_TYPE];

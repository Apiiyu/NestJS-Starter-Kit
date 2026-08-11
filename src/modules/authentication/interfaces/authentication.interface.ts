/**
 * @description The token pair a successful login or refresh hands back.
 *
 * The refresh token is returned in the body rather than set as an httpOnly cookie: a cookie
 * would trade XSS resistance for a CSRF surface on every state-changing route, and does nothing
 * for the mobile and service clients this kit targets.
 */
export interface ILogin {
  accessToken: string;
  refreshToken: string;
}

/**
 * @description Result of revoking a refresh token.
 *
 * `revoked` reports whether a live token was actually found and revoked. Logout answers 200
 * either way — reporting "no such token" would turn the endpoint into an oracle for which
 * tokens exist.
 */
export interface ILogout {
  revoked: boolean;
}

/**
 * @description A freshly minted refresh token.
 *
 * `token` is the raw value and the only copy that will ever exist — the database keeps
 * a SHA-256 of it and nothing else. Hand it to the client and drop it; there is no way
 * to recover it afterwards.
 */
export interface IIssuedRefreshToken {
  id: string;
  token: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * @description The successor produced by spending a refresh token.
 *
 * `replacedId` is the token that was just revoked to produce this one, kept so the
 * chain can be walked during an incident review.
 */
export interface IRotatedRefreshToken extends IIssuedRefreshToken {
  replacedId: string;
}

/**
 * @description The row the rotation statement returns when it successfully claims a refresh
 * token.
 *
 * Claiming is a single conditional UPDATE ... RETURNING rather than a read followed by a
 * write, so that two concurrent uses of the same token cannot both succeed. These are the
 * columns the caller needs afterwards to mint the replacement and, on reuse, to revoke the
 * whole family.
 */
export interface IClaimedToken {
  id: string;
  userId: string;
  familyId: string;
  expiresAt: Date;
}

export interface ILogin {
  accessToken: string;
  refreshToken: string;
}

/** Result of revoking a refresh token. */
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

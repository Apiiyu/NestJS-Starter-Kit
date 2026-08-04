/**
 * @description Stable, machine-readable error codes returned alongside every error
 * response.
 *
 * These exist because HTTP status codes are too coarse to act on: a client cannot
 * tell "the token expired, refresh it" from "you lack the role, give up" when both
 * arrive as 401/403, and it must not resort to string-matching `message`, which is
 * free text that changes whenever someone rewords it.
 *
 * Rules for adding to this catalog:
 * - A code is part of the public API contract. Once released, never repurpose it —
 *   add a new one and leave the old value alone.
 * - Group by domain prefix so ownership is obvious at a glance.
 * - Keep it flat and explicit; the value is looked up by clients, not computed.
 */
export const ERROR_CODE = {
  /**
   * Generic fallbacks. `INTERNAL_ERROR` is what an unrecognised throwable maps to,
   * so its appearance in logs is a signal that something needs a real code.
   */
  BAD_REQUEST: 'COMMON_BAD_REQUEST',
  CONFLICT: 'COMMON_CONFLICT',
  FORBIDDEN: 'COMMON_FORBIDDEN',
  INTERNAL_ERROR: 'COMMON_INTERNAL_ERROR',
  NOT_FOUND: 'COMMON_NOT_FOUND',
  RATE_LIMITED: 'COMMON_RATE_LIMITED',
  UNAUTHORIZED: 'COMMON_UNAUTHORIZED',
  VALIDATION_FAILED: 'COMMON_VALIDATION_FAILED',

  /**
   * Users domain. All three are 409s raised from a caught Postgres 23505 rather
   * than from a preceding existence check — see `postgres-error.helper.ts` for why
   * the read-then-write version is a race.
   *
   * `USER_RESTORE_CONFLICT` is deliberately distinct from the two "taken" codes:
   * the client action that resolves it differs. A taken email during signup means
   * "pick another"; a conflict during restore means "an active user already holds
   * this identity, so deal with that row first".
   */
  USER_EMAIL_TAKEN: 'USER_EMAIL_TAKEN',
  USER_RESTORE_CONFLICT: 'USER_RESTORE_CONFLICT',
  USER_USERNAME_TAKEN: 'USER_USERNAME_TAKEN',

  /**
   * Authentication domain. All 401s, and all three exist because the client's next
   * move differs: `EXPIRED` means "refresh and retry, silently"; `INVALID` means
   * "this credential is junk, send the user to log in"; `WRONG_TYPE` means "you sent
   * a refresh token to an endpoint that wants an access token", which is a bug in the
   * caller, not a session problem. Collapsing them into a bare 401 forces clients to
   * guess, and the usual guess is a logout loop.
   */
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_WRONG_TYPE: 'AUTH_TOKEN_WRONG_TYPE',
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];

/**
 * @description Default code for a given HTTP status, used when a thrown exception
 * carries no explicit code of its own.
 */
export const ERROR_CODE_BY_STATUS: Readonly<Record<number, ErrorCode>> = {
  400: ERROR_CODE.BAD_REQUEST,
  401: ERROR_CODE.UNAUTHORIZED,
  403: ERROR_CODE.FORBIDDEN,
  404: ERROR_CODE.NOT_FOUND,
  409: ERROR_CODE.CONFLICT,
  422: ERROR_CODE.VALIDATION_FAILED,
  429: ERROR_CODE.RATE_LIMITED,
  500: ERROR_CODE.INTERNAL_ERROR,
};

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
  FORBIDDEN: 'COMMON_FORBIDDEN',
  INTERNAL_ERROR: 'COMMON_INTERNAL_ERROR',
  NOT_FOUND: 'COMMON_NOT_FOUND',
  RATE_LIMITED: 'COMMON_RATE_LIMITED',
  UNAUTHORIZED: 'COMMON_UNAUTHORIZED',
  VALIDATION_FAILED: 'COMMON_VALIDATION_FAILED',
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
  422: ERROR_CODE.VALIDATION_FAILED,
  429: ERROR_CODE.RATE_LIMITED,
  500: ERROR_CODE.INTERNAL_ERROR,
};

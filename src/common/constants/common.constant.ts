/** @description Generic message for a 400 whose cause must not be disclosed to the caller. */
export const BAD_REQUEST_MSG = 'Bad Request';

/**
 * @description bcrypt cost factor for password hashing.
 *
 * Each increment doubles the work. Ten is the common default and keeps a login under roughly
 * 100 ms on ordinary hardware; raising it strengthens stored hashes but also makes the login
 * endpoint that much cheaper to use as a denial-of-service lever.
 */
export const SALT_OR_ROUND = 10;

/**
 * @description The values a query-string flag may take to mean true.
 *
 * A query parameter always arrives as a string, so `?isDeleted=false` is truthy under a plain
 * boolean cast. Comparing against an explicit allowlist is what stops that classic bug.
 */
export const TRUE_VALUE = ['true', true, 1, '1'];

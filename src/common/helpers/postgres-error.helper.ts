/**
 * @description PostgreSQL `unique_violation`.
 * @see https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export const PG_UNIQUE_VIOLATION = '23505';

/**
 * @description The subset of `node-postgres`' error shape this module reads.
 *
 * Declared locally rather than imported from `pg` so the helper stays a pure value
 * check with no driver dependency — which is also what makes it testable with a plain
 * object literal instead of a real failed query.
 */
interface IPostgresDriverError {
  code?: string;
  constraint?: string;
  detail?: string;
}

/**
 * @description Unwrap the driver error TypeORM hides inside `QueryFailedError`.
 *
 * TypeORM keeps the original `pg` error on `.driverError` and does not copy
 * `constraint` onto the wrapper, so reading the wrapper alone loses the one field
 * that says *which* uniqueness rule was broken. Falling back to the error itself
 * keeps the helper working when a raw driver error is thrown unwrapped.
 */
const asDriverError = (error: unknown): IPostgresDriverError | null => {
  if (typeof error !== 'object' || error === null) {
    return null;
  }

  const { driverError } = error as { driverError?: unknown };
  const candidate = driverError ?? error;

  return typeof candidate === 'object' && candidate !== null
    ? (candidate as IPostgresDriverError)
    : null;
};

/**
 * @description Name of the unique index a failed write violated, or `null` when the
 * failure was not a unique violation at all.
 *
 * This exists so writes can be attempted and the conflict caught, instead of asking
 * "does this row exist?" first and inserting after. That read-then-write pattern is a
 * TOCTOU race: two concurrent registrations both read "no", both insert, and one of
 * them dies on the index anyway — but as an unhandled 500 rather than a 409.
 *
 * Returns an empty string when the code matches but Postgres reported no constraint
 * name, which callers should treat as "unique violation, source unknown" and let fall
 * through to their generic handler.
 */
export const getUniqueViolationConstraint = (error: unknown): string | null => {
  const driverError = asDriverError(error);

  if (driverError?.code !== PG_UNIQUE_VIOLATION) {
    return null;
  }

  return driverError.constraint ?? '';
};

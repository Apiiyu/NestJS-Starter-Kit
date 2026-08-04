// Helpers
import { getUniqueViolationConstraint, PG_UNIQUE_VIOLATION } from './postgres-error.helper';

describe('getUniqueViolationConstraint', () => {
  it('reads the constraint out of the driverError TypeORM wraps', () => {
    const error = {
      name: 'QueryFailedError',
      message: 'duplicate key value violates unique constraint "UQ_users_email_active"',
      driverError: {
        code: PG_UNIQUE_VIOLATION,
        constraint: 'UQ_users_email_active',
        detail: 'Key (email)=(taken@test.com) already exists.',
      },
    };

    expect(getUniqueViolationConstraint(error)).toBe('UQ_users_email_active');
  });

  /**
   * The wrapper is allowed to carry `code`, but it never carries `constraint`.
   * Reading the outer object would therefore identify the failure as a unique
   * violation and still be unable to say which index broke — which is the whole
   * question the caller is asking.
   */
  it('prefers the driverError over the wrapper, because only it names the index', () => {
    const error = {
      code: PG_UNIQUE_VIOLATION,
      driverError: {
        code: PG_UNIQUE_VIOLATION,
        constraint: 'UQ_users_username_active',
      },
    };

    expect(getUniqueViolationConstraint(error)).toBe('UQ_users_username_active');
  });

  it('handles a raw driver error that was never wrapped', () => {
    expect(
      getUniqueViolationConstraint({
        code: PG_UNIQUE_VIOLATION,
        constraint: 'UQ_users_email_active',
      }),
    ).toBe('UQ_users_email_active');
  });

  it('returns an empty string when the code matches but no constraint was reported', () => {
    expect(getUniqueViolationConstraint({ code: PG_UNIQUE_VIOLATION })).toBe('');
  });

  it('returns null for a different Postgres error code', () => {
    // 23503 is foreign_key_violation — a real failure, but not this helper's business.
    expect(getUniqueViolationConstraint({ code: '23503', constraint: 'FK_users_role' })).toBeNull();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'boom'],
    ['a plain Error', new Error('boom')],
  ])('returns null for %s', (_label, input) => {
    expect(getUniqueViolationConstraint(input)).toBeNull();
  });
});

export const REGEX_UPPERCASE = /(?=.*[A-Z])/;
export const REGEX_LOWERCASE = /(?=.*[a-z])/;
export const REGEX_DIGIT = /(?=.*\d)/;
export const REGEX_SPECIAL_CHAR = /(?=.*\W)/;
export const REGEX_NO_PERIOD_OR_NEWLINE = /^(?![.\n])/;
export const REGEX_ANY_CHAR = /.*$/;

/**
 * @description Password composition policy: at least one uppercase letter, at least one
 * lowercase letter, and at least one digit or special character.
 *
 * Composition only. Length is deliberately *not* expressed here — `@MinLength` and
 * `@MaxLength` on the DTOs enforce it, so a too-short password gets told it is too short
 * instead of one opaque "does not match the required pattern" that covers four unrelated
 * rules at once.
 *
 * Two changes from the original, which was assembled at runtime from the sources above:
 *
 * - `^(?![.\n])` only rejected a line break in the *first* position while allowing one
 *   anywhere else in the string. `[^\r\n]+` is what that rule was reaching for.
 * - Spaces stay legal. A passphrase is a good password, and forbidding whitespace to
 *   tidy up the pattern would quietly rule the strongest option out.
 *
 * The set of required character classes is unchanged, so no existing password that used
 * to be acceptable becomes unacceptable.
 */
export const REGEX_PASSWORD = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[\d\W])[^\r\n]+$/;

/**
 * bcrypt hashes at most 72 bytes and silently ignores everything past that — two
 * passwords sharing their first 72 bytes verify against each other. Capping the input
 * keeps that truncation from turning into an accidental credential collision.
 */
export const PASSWORD_MAX_LENGTH = 72;

/** NIST SP 800-63B's floor for a user-chosen secret. */
export const PASSWORD_MIN_LENGTH = 8;

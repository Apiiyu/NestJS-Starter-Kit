/*
 * The six lookaheads below are the pieces `REGEX_PASSWORD` was once assembled from at runtime.
 * They are kept as named parts so a project built on this kit can compose a different policy
 * — a stricter one for admin passwords, say — without rewriting the lookahead syntax by hand
 * and getting it subtly wrong.
 */

/** @description Asserts the string contains at least one uppercase letter. */
export const REGEX_UPPERCASE = /(?=.*[A-Z])/;

/** @description Asserts the string contains at least one lowercase letter. */
export const REGEX_LOWERCASE = /(?=.*[a-z])/;

/** @description Asserts the string contains at least one digit. */
export const REGEX_DIGIT = /(?=.*\d)/;

/** @description Asserts the string contains at least one non-word character. */
export const REGEX_SPECIAL_CHAR = /(?=.*\W)/;

/**
 * @description Asserts the string does not begin with a period or a line break.
 *
 * First position only — it says nothing about the rest of the string. `REGEX_PASSWORD` uses
 * `[^\r\n]+` instead, which is what this rule was reaching for.
 */
export const REGEX_NO_PERIOD_OR_NEWLINE = /^(?![.\n])/;

/** @description Matches the remainder of the string, used to terminate a composed pattern. */
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
 * @description Longest password the API accepts.
 *
 * bcrypt hashes at most 72 bytes and silently ignores everything past that — two
 * passwords sharing their first 72 bytes verify against each other. Capping the input
 * keeps that truncation from turning into an accidental credential collision.
 */
export const PASSWORD_MAX_LENGTH = 72;

/** @description Shortest password the API accepts — NIST SP 800-63B's floor for a
 * user-chosen secret. */
export const PASSWORD_MIN_LENGTH = 8;

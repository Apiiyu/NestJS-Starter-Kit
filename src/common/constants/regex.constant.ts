export const REGEX_UPPERCASE = /(?=.*[A-Z])/;
export const REGEX_LOWERCASE = /(?=.*[a-z])/;
export const REGEX_DIGIT = /(?=.*\d)/;
export const REGEX_SPECIAL_CHAR = /(?=.*\W)/;
export const REGEX_NO_PERIOD_OR_NEWLINE = /^(?![.\n])/;
export const REGEX_ANY_CHAR = /.*$/;

/**
 * @description Password policy: no leading period or newline, at least one uppercase and
 * one lowercase letter, and at least one digit *or* one special character.
 *
 * Written as a literal rather than assembled from the sources above. Composing it at
 * runtime bought nothing — the parts are never recombined any other way — while making
 * the effective pattern impossible to read at its own definition, and turning a
 * compile-time constant into a `new RegExp` over a built string, which is
 * indistinguishable from building a pattern out of user input.
 *
 * Piece by piece, in order:
 *   ^(?![.\n])              REGEX_NO_PERIOD_OR_NEWLINE
 *   (?=.*[A-Z])             REGEX_UPPERCASE
 *   (?=.*[a-z])             REGEX_LOWERCASE
 *   (?:(?=.*\d)|(?=.*\W))   REGEX_DIGIT or REGEX_SPECIAL_CHAR
 *   .*$                     REGEX_ANY_CHAR
 */
export const REGEX_PASSWORD = /^(?![.\n])(?=.*[A-Z])(?=.*[a-z])(?:(?=.*\d)|(?=.*\W)).*$/;

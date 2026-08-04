/**
 * @description Milliseconds per supported unit.
 *
 * A `Map` rather than an object literal so the lookup key — which comes from parsing a
 * configuration string — cannot be used as a property injection sink.
 */
const MS_PER_UNIT = new Map<string, number>([
  ['ms', 1],
  ['s', 1_000],
  ['m', 60_000],
  ['h', 3_600_000],
  ['d', 86_400_000],
]);

const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/;

/**
 * @description Turn a duration string like `7d` or `15m` into milliseconds.
 *
 * `ms` would do this, and `@nestjs/jwt` already pulls it in — but only as a type in
 * this codebase. Importing it as a value would mean depending on a package that is not
 * in `package.json`, which keeps working right up until the day `@nestjs/jwt` drops or
 * bumps it. The grammar accepted here is a strict subset of the same syntax, so env
 * values stay interchangeable with the ones `JwtModule` parses.
 *
 * Throws on anything unrecognised rather than falling back to a default. A typo in
 * `JWT_REFRESH_EXPIRES_IN` should stop the request, not quietly hand out tokens with
 * some other lifetime.
 */
export const parseDurationToMs = (value: string): number => {
  const match = DURATION_PATTERN.exec(value.trim());
  const unit = match ? MS_PER_UNIT.get(match[2]) : undefined;

  if (!match || unit === undefined) {
    throw new Error(
      `Unsupported duration "${value}". Expected a whole number followed by ms, s, m, h or d — for example "15m" or "7d".`,
    );
  }

  return Number(match[1]) * unit;
};

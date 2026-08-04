// Helpers
import { parseDurationToMs } from './duration.helper';

describe('parseDurationToMs', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 900_000],
    ['24h', 86_400_000],
    ['7d', 604_800_000],
  ])('converts %s', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it('tolerates surrounding whitespace, which env files pick up easily', () => {
    expect(parseDurationToMs('  7d ')).toBe(604_800_000);
  });

  /**
   * Failing loudly matters more than being permissive here. A silent fallback would
   * mean a typo in `JWT_REFRESH_EXPIRES_IN` hands out tokens with a lifetime nobody
   * chose, and nothing in the logs would say so.
   */
  it.each([
    ['an unknown unit', '7w'],
    ['a missing unit', '7'],
    ['a fractional value', '1.5d'],
    ['a negative value', '-1d'],
    ['an empty string', ''],
    ['prose', 'seven days'],
  ])('throws on %s', (_label, input) => {
    expect(() => parseDurationToMs(input)).toThrow(/Unsupported duration/);
  });
});

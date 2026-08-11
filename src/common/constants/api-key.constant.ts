/**
 * @description The header the metrics scraper presents its key in.
 *
 * Named here rather than written inline because two places must agree on it and a third must
 * know it: the strategy that reads it, the guard that protects the route, and the Pino redact
 * list — a key that leaks into a request log is a leaked key.
 */
export const API_KEY_HEADER = 'x-api-key';

/**
 * @description The Passport strategy name the API-key guard activates.
 *
 * Passport resolves strategies by string at runtime, so a typo here fails as "unknown
 * strategy" at request time rather than at compile time. One constant is what keeps the guard
 * and the strategy registration from drifting apart.
 */
export const API_KEY_STRATEGY = 'api-key';

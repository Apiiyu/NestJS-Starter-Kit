/**
 * @description Name of the BullMQ queue carrying scheduled housekeeping work.
 *
 * Separate from the mail queue so a backlog of email cannot delay a cleanup sweep, and so the
 * two can be given different worker concurrency.
 */
export const MAINTENANCE_QUEUE = 'maintenance';

/**
 * @description The job names this queue accepts.
 *
 * Also the repeatable-job key: BullMQ deduplicates a repeatable job by name and pattern, which
 * is what stops N application replicas from registering N copies of the same sweep.
 */
export const MAINTENANCE_JOB = {
  CLEANUP_REFRESH_TOKENS: 'cleanup-refresh-tokens',
} as const;

/**
 * @description Hourly, on the hour — expired rows are cheap to leave for up to an hour.
 *
 * An expired refresh token is already rejected on presentation, so this sweep reclaims storage
 * rather than enforcing security. That is why the interval can be this relaxed.
 */
export const MAINTENANCE_CLEANUP_CRON = '0 * * * *';

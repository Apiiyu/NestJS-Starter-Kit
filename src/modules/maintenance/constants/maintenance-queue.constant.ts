export const MAINTENANCE_QUEUE = 'maintenance';

export const MAINTENANCE_JOB = {
  CLEANUP_REFRESH_TOKENS: 'cleanup-refresh-tokens',
} as const;

/** Hourly, on the hour — expired rows are cheap to leave for up to an hour. */
export const MAINTENANCE_CLEANUP_CRON = '0 * * * *';

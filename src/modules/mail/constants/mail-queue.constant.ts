/**
 * @description Name of the BullMQ queue carrying outbound email.
 *
 * The producer and the worker resolve each other by this string alone, so it is declared once
 * — a mismatch would not fail loudly, it would simply leave jobs queued and never processed.
 */
export const MAIL_QUEUE = 'mail';

/**
 * @description The job names this queue accepts.
 *
 * The processor switches on the name and warns on anything unrecognised, so adding a new kind
 * of email means adding an entry here and a branch there rather than inventing a string at
 * the call site.
 */
export const MAIL_JOB = {
  WELCOME: 'send-welcome-email',
} as const;

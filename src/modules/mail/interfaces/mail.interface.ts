/**
 * @description Payload of a welcome-email job.
 *
 * Carries the recipient's address and display name rather than a user ID, so the worker can
 * render and send without a database read — and so a job still resolves correctly if the user
 * row changes or is deleted between enqueue and delivery.
 */
export interface IWelcomeEmailJob {
  email: string;
  username: string;
}

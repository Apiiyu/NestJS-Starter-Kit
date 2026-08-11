/**
 * @description What the per-request context holds for the lifetime of one request.
 *
 * `user` is optional because the store is created by middleware, which runs before any guard
 * has authenticated anyone — the field is filled in later, once there is someone to record.
 */
export interface IRequestContextStore {
  correlationId: string;
  method: string;
  path: string;
  requestId: string;
  user?: IRequestUser;
}

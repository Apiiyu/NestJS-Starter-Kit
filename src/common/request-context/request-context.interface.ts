export interface IRequestContextStore {
  correlationId: string;
  method: string;
  path: string;
  requestId: string;
  user?: IRequestUser;
}

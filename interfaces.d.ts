export {};

/**
 * @description Here's a way to extend the global interfaces.
 */
declare global {
  interface IRequestUser {
    id: string;
    email: string;
    username: string;
  }

  interface IResultFilter<T = Record<string, unknown>> {
    data: T[];
    total: number;
    totalData: number;
  }

  interface IConstructBaseResponse<T> {
    statusCode: number;
    message: string;
    data: T;
  }

  interface IConstructPageMeta {
    page: number;
    size: number;
    total: number;
    totalData: number;
  }

  interface ICustomRequestHeaders extends Request {
    user: IRequestUser;
  }

  interface IValidateJWTStrategy {
    sub: string;
    username: string;
    email: string;
  }
}

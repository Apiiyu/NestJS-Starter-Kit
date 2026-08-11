/**
 * @description Shape returned for every failed request.
 *
 * The first three fields deliberately mirror `BaseResponseDto`, which wraps every
 * successful response. Before `AllExceptionsFilter` existed the two halves of the API
 * disagreed: success came back as `{ statusCode, message, data }` while errors fell
 * through to Nest's default `{ statusCode, message, error }`, so a client had to
 * implement two parsers for one endpoint.
 */
export interface IErrorResponse {
  statusCode: number;
  message: string;
  data: null;
  errorCode: string;
  path: string;
  timestamp: string;
  requestId?: string;
}

/**
 * @description What a controller method is expected to return before the response
 * interceptor wraps it.
 *
 * `result` is the payload; `statusCode` and `message` are optional overrides. When a handler
 * omits them the interceptor falls back to the HTTP status Nest already set and an empty
 * message, which is why a handler can return `{ result }` alone and still produce a
 * well-formed envelope.
 */
export type HandlerResponse<T> = { statusCode?: number; message?: string; result: T };

/**
 * @description The slice of request data `ContextInterceptor` copies onto the request so
 * custom class-validator constraints can reach it.
 *
 * A validator only ever receives the object being validated, which for a body DTO means the
 * body alone. Anything that has to cross-check a path parameter or a query flag — "this slug
 * must be unique within the tenant in the URL" — needs those values carried alongside, and
 * this is the shape they travel in.
 */
export type RequestContextPayload = {
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

/**
 * @description The request object as `ContextInterceptor` sees it: the fields it reads, plus
 * the `context` property it writes.
 *
 * Deliberately structural rather than Express's own `Request`. The interceptor only needs
 * these few fields, and typing it this way keeps the same code working for any transport
 * whose request carries them.
 */
export type HttpRequest = {
  context?: RequestContextPayload;
  correlationId?: string;
  params: Record<string, string>;
  query: Record<string, unknown>;
  requestId?: string;
  user?: IRequestUser;
};

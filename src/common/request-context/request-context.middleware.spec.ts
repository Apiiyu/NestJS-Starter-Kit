// NestJS Libraries
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';

// Express
import type { NextFunction, Request, Response } from 'express';

// Request Context
import { RequestContextMiddleware } from './request-context.middleware';
import { RequestContextService } from './request-context.service';

type RequestWithContext = Request & {
  correlationId?: string;
  id?: string;
  requestId?: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('RequestContextMiddleware', () => {
  let middleware: RequestContextMiddleware;
  let requestContextService: RequestContextService;
  let response: Response;
  let next: NextFunction;

  const buildRequest = (overrides: Partial<RequestWithContext> = {}): RequestWithContext =>
    ({
      headers: {},
      method: 'GET',
      originalUrl: '/api/users',
      url: '/api/users',
      ...overrides,
    }) as RequestWithContext;

  beforeEach(async () => {
    const moduleReference: TestingModule = await Test.createTestingModule({
      providers: [RequestContextMiddleware, RequestContextService],
    }).compile();

    middleware = moduleReference.get(RequestContextMiddleware);
    requestContextService = moduleReference.get(RequestContextService);

    // `run` is stubbed so each case can assert on the context it was handed without the
    // AsyncLocalStorage machinery deciding whether `next` is reached.
    jest.spyOn(requestContextService, 'run').mockImplementation((_context, callback) => {
      callback();
    });

    response = { setHeader: jest.fn() } as unknown as Response;
    next = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('prefers an id already attached to the request over anything in the headers', () => {
    const request = buildRequest({
      headers: { 'x-request-id': 'from-header' },
      requestId: 'already-assigned',
    });

    middleware.use(request, response, next);

    expect(request.requestId).toBe('already-assigned');
    expect(response.setHeader).toHaveBeenCalledWith('x-request-id', 'already-assigned');
  });

  it('falls back to request.id when no requestId is set', () => {
    const request = buildRequest({ id: 'express-assigned' });

    middleware.use(request, response, next);

    expect(request.requestId).toBe('express-assigned');
  });

  it('reads the id from the x-request-id header when the request carries none', () => {
    const request = buildRequest({ headers: { 'x-request-id': 'from-header' } });

    middleware.use(request, response, next);

    expect(request.requestId).toBe('from-header');
  });

  it('takes the first entry when a header arrives repeated', () => {
    const request = buildRequest({
      headers: { 'x-request-id': ['first', 'second'] as unknown as string },
    });

    middleware.use(request, response, next);

    expect(request.requestId).toBe('first');
  });

  it('generates a uuid when nothing supplies an id', () => {
    const request = buildRequest();

    middleware.use(request, response, next);

    expect(request.requestId).toEqual(expect.stringMatching(UUID_PATTERN));
  });

  it('defaults the correlation id to the request id, and honours the header when present', () => {
    const withoutHeader = buildRequest({ requestId: 'request-1' });

    middleware.use(withoutHeader, response, next);
    expect(withoutHeader.correlationId).toBe('request-1');

    const withHeader = buildRequest({
      headers: { 'x-correlation-id': 'trace-9' },
      requestId: 'request-2',
    });

    middleware.use(withHeader, response, next);
    expect(withHeader.correlationId).toBe('trace-9');
    expect(response.setHeader).toHaveBeenCalledWith('x-correlation-id', 'trace-9');
  });

  it('runs the downstream handler inside the populated context', () => {
    const request = buildRequest({ requestId: 'request-3' });

    middleware.use(request, response, next);

    expect(requestContextService.run).toHaveBeenCalledWith(
      {
        correlationId: 'request-3',
        method: 'GET',
        path: '/api/users',
        requestId: 'request-3',
      },
      next,
    );
    expect(next).toHaveBeenCalledTimes(1);
  });
});

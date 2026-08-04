import { BadRequestException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';

import { ERROR_CODE } from '../constants/error-code.constant';
import type { RequestContextService } from '../request-context/request-context.service';
import { AllExceptionsFilter } from './all-exceptions.filter';

const buildHost = (url = '/api/v1/users', method = 'GET') => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });

  const host = {
    switchToHttp: () => ({
      getRequest: () => ({ url, method }),
      getResponse: () => ({ status }),
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
};

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    const requestContextService = {
      requestId: 'req-abc123',
    } as unknown as RequestContextService;

    filter = new AllExceptionsFilter(requestContextService);

    // The filter logs every caught exception; silence it so a passing run does not
    // print stack traces that look like real failures.
    jest.spyOn(filter['_logger'], 'error').mockImplementation(() => undefined);
    jest.spyOn(filter['_logger'], 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  it('renders an HttpException in the shared envelope', () => {
    const { host, json, status } = buildHost('/api/v1/users/uuid-x');

    filter.catch(new NotFoundException('User with id uuid-x not found.'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'User with id uuid-x not found.',
        data: null,
        errorCode: ERROR_CODE.NOT_FOUND,
        path: '/api/v1/users/uuid-x',
        requestId: 'req-abc123',
      }),
    );
  });

  it('keeps the first three keys aligned with the success envelope', () => {
    const { host, json } = buildHost();

    filter.catch(new NotFoundException('nope'), host);

    // BaseResponseDto is { statusCode, message, data }. The whole reason this filter
    // exists is that errors used to answer in a different shape, so assert the
    // overlap explicitly rather than trusting it to stay true.
    const [body] = json.mock.calls[0] as [Record<string, unknown>];
    expect(Object.keys(body)).toEqual(expect.arrayContaining(['statusCode', 'message', 'data']));
  });

  it('maps a non-HttpException to 500 without leaking its message', () => {
    const { host, json, status } = buildHost();

    filter.catch(new Error('connection string postgres://user:hunter2@db'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);

    const [body] = json.mock.calls[0] as [{ message: string; errorCode: string }];
    expect(body.message).toBe('Internal server error');
    expect(body.message).not.toContain('hunter2');
    expect(body.errorCode).toBe(ERROR_CODE.INTERNAL_ERROR);
  });

  it('joins the per-field messages ValidationPipe throws as an array', () => {
    const { host, json } = buildHost('/api/v1/users', 'POST');

    filter.catch(
      new BadRequestException({
        message: ['email must be an email', 'username should not be empty'],
      }),
      host,
    );

    const [body] = json.mock.calls[0] as [{ message: string }];
    expect(body.message).toBe('email must be an email, username should not be empty');
  });

  it('prefers an explicit errorCode carried by the exception', () => {
    const { host, json } = buildHost();

    filter.catch(
      new HttpException(
        { message: 'Token expired', errorCode: 'AUTH_TOKEN_EXPIRED' },
        HttpStatus.UNAUTHORIZED,
      ),
      host,
    );

    const [body] = json.mock.calls[0] as [{ errorCode: string }];
    expect(body.errorCode).toBe('AUTH_TOKEN_EXPIRED');
  });

  it('emits an ISO-8601 timestamp', () => {
    const { host, json } = buildHost();

    filter.catch(new NotFoundException('nope'), host);

    const [body] = json.mock.calls[0] as [{ timestamp: string }];
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('logs server faults at error level and client faults at warn', () => {
    const errorSpy = jest.spyOn(filter['_logger'], 'error');
    const warnSpy = jest.spyOn(filter['_logger'], 'warn');

    filter.catch(new NotFoundException('nope'), buildHost().host);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).not.toHaveBeenCalled();

    filter.catch(new Error('boom'), buildHost().host);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});

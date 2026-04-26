import type { ExecutionContext } from '@nestjs/common';
import { StreamableFile } from '@nestjs/common';
import { of } from 'rxjs';
import { CustomBaseResponseInterceptor } from './base-response.interceptor';

const makeContext = (statusCode = 200) =>
  ({
    switchToHttp: () => ({
      getResponse: () => ({ statusCode }),
    }),
  }) as unknown as ExecutionContext;

const makeHandler = (value: unknown) => ({
  handle: () => of(value),
});

describe('CustomBaseResponseInterceptor', () => {
  let interceptor: CustomBaseResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new CustomBaseResponseInterceptor();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  it('passes StreamableFile through without wrapping', (done) => {
    const file = new StreamableFile(Buffer.from(''));
    interceptor.intercept(makeContext(), makeHandler(file)).subscribe((result) => {
      expect(result).toBe(file);
      done();
    });
  });

  it('passes falsy data through without wrapping', (done) => {
    interceptor.intercept(makeContext(), makeHandler(null)).subscribe((result) => {
      expect(result).toBeNull();
      done();
    });
  });

  it('wraps a handler response using the HTTP status code', (done) => {
    const data = { result: { id: '1' } };
    interceptor.intercept(makeContext(201), makeHandler(data)).subscribe((result: unknown) => {
      const res = result as { statusCode: number; message: string; data: unknown };
      expect(res.statusCode).toBe(201);
      expect(res.message).toBe('');
      expect(res.data).toEqual({ id: '1' });
      done();
    });
  });

  it('uses statusCode and message from the handler payload when provided', (done) => {
    const data = { statusCode: 200, message: 'OK', result: 'payload' };
    interceptor.intercept(makeContext(200), makeHandler(data)).subscribe((result: unknown) => {
      const res = result as { statusCode: number; message: string; data: unknown };
      expect(res.statusCode).toBe(200);
      expect(res.message).toBe('OK');
      expect(res.data).toBe('payload');
      done();
    });
  });
});

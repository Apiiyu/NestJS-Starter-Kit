import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  let service: RequestContextService;

  beforeEach(() => {
    service = new RequestContextService();
  });

  it('stores and exposes request metadata inside the async context', async () => {
    await new Promise<void>((resolve) => {
      service.run(
        {
          correlationId: 'corr-123',
          method: 'GET',
          path: '/api/v1/users',
          requestId: 'req-123',
        },
        () => {
          expect(service.requestId).toBe('req-123');
          expect(service.correlationId).toBe('corr-123');
          resolve();
        },
      );
    });
  });

  it('allows attaching the authenticated user to the current request context', async () => {
    const user: IRequestUser = {
      email: 'test@example.com',
      id: 'user-1',
      username: 'tester',
    };

    await new Promise<void>((resolve) => {
      service.run(
        {
          correlationId: 'corr-123',
          method: 'POST',
          path: '/api/v1/authentication/login',
          requestId: 'req-123',
        },
        () => {
          service.setUser(user);
          expect(service.getUser()).toEqual(user);
          resolve();
        },
      );
    });
  });
});

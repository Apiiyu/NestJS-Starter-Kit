// Guards
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  it('binds a Nest guard to the API-key Passport strategy', () => {
    const guard = new ApiKeyGuard();

    expect(guard).toBeInstanceOf(ApiKeyGuard);
    expect(typeof guard.canActivate).toBe('function');
  });
});

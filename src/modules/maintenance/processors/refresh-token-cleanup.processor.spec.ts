import type { Job } from 'bullmq';

import { RefreshTokenCleanupProcessor } from './refresh-token-cleanup.processor';

describe('RefreshTokenCleanupProcessor', () => {
  const mockRefreshTokenService = { purgeExpired: jest.fn() };
  let processor: RefreshTokenCleanupProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new RefreshTokenCleanupProcessor(mockRefreshTokenService as never);
  });

  it('purges expired refresh tokens and reports how many were deleted', async () => {
    mockRefreshTokenService.purgeExpired.mockResolvedValue(5);

    await expect(processor.process({ id: 'job-1' } as Job)).resolves.toEqual({ deleted: 5 });
    expect(mockRefreshTokenService.purgeExpired).toHaveBeenCalledTimes(1);
  });

  it('reports zero when nothing was expired', async () => {
    mockRefreshTokenService.purgeExpired.mockResolvedValue(0);

    await expect(processor.process({ id: 'job-2' } as Job)).resolves.toEqual({ deleted: 0 });
  });
});

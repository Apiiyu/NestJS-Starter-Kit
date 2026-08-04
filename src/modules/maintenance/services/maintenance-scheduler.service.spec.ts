import { MAINTENANCE_JOB } from '../constants/maintenance-queue.constant';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';

describe('MaintenanceSchedulerService', () => {
  const mockQueue = { add: jest.fn() };
  let service: MaintenanceSchedulerService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MaintenanceSchedulerService(mockQueue as never);
  });

  it('schedules the cleanup job with a stable jobId so restarts do not duplicate it', async () => {
    await service.onModuleInit();

    expect(mockQueue.add).toHaveBeenCalledWith(
      MAINTENANCE_JOB.CLEANUP_REFRESH_TOKENS,
      {},
      expect.objectContaining({
        jobId: MAINTENANCE_JOB.CLEANUP_REFRESH_TOKENS,
        repeat: expect.objectContaining({ pattern: expect.any(String) }),
      }),
    );
  });
});

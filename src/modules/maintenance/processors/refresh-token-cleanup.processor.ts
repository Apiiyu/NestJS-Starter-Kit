// Constants
import { MAINTENANCE_QUEUE } from '../constants/maintenance-queue.constant';

// NestJS Libraries
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

// Services
import { RefreshTokenService } from '../../authentication';

// BullMQ
import type { Job } from 'bullmq';

@Processor(MAINTENANCE_QUEUE)
export class RefreshTokenCleanupProcessor extends WorkerHost {
  private readonly _logger = new Logger(RefreshTokenCleanupProcessor.name);

  constructor(private readonly _refreshTokenService: RefreshTokenService) {
    super();
  }

  public async process(job: Job): Promise<{ deleted: number }> {
    const deleted = await this._refreshTokenService.purgeExpired();

    this._logger.log(`Cleanup job ${job.id}: purged ${deleted} expired refresh token(s).`);

    return { deleted };
  }
}

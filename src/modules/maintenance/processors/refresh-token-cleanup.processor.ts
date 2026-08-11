// BullMQ
import type { Job } from 'bullmq';

// Constants
import { MAINTENANCE_QUEUE } from '../constants/maintenance-queue.constant';

// Modules
import { RefreshTokenService } from '../../authentication';

// NestJS Libraries
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';

/**
 * @description The worker that purges expired refresh tokens on the scheduled sweep.
 *
 * Reclaims storage rather than enforcing security — an expired token is already rejected when
 * presented — which is why running late is harmless and the job needs no urgency.
 */
@Processor(MAINTENANCE_QUEUE)
export class RefreshTokenCleanupProcessor extends WorkerHost {
  private readonly _logger = new Logger(RefreshTokenCleanupProcessor.name);

  constructor(private readonly _refreshTokenService: RefreshTokenService) {
    super();
  }

  /**
   * @description Deletes refresh tokens that are past their expiry and reports how many went.
   *
   * Returns the count rather than logging and discarding it, so the number lands in BullMQ's
   * job result and a sweep that suddenly deletes nothing — or everything — is visible.
   *
   * @param job The scheduled job, used only for its identifier in the log line.
   */
  public async process(job: Job): Promise<{ deleted: number }> {
    const deleted = await this._refreshTokenService.purgeExpired();

    this._logger.log(`Cleanup job ${job.id}: purged ${deleted} expired refresh token(s).`);

    return { deleted };
  }
}

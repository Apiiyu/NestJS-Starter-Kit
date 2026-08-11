// BullMQ
import type { Queue } from 'bullmq';

// Constants
import {
  MAINTENANCE_CLEANUP_CRON,
  MAINTENANCE_JOB,
  MAINTENANCE_QUEUE,
} from '../constants/maintenance-queue.constant';

// NestJS Libraries
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';

/**
 * @description Schedules the repeatable cleanup job on boot.
 *
 * BullMQ keys a repeatable job by its queue, name, and repeat options, so calling
 * `add` again with the same three on every restart reuses the existing schedule
 * instead of stacking a duplicate one.
 */
@Injectable()
export class MaintenanceSchedulerService implements OnModuleInit {
  private readonly _logger = new Logger(MaintenanceSchedulerService.name);

  constructor(@InjectQueue(MAINTENANCE_QUEUE) private readonly _queue: Queue) {}

  /**
   * @description Registers the repeatable cleanup job once the module is ready.
   *
   * BullMQ deduplicates a repeatable job by name and cron pattern, so every replica can run
   * this at startup and the sweep is still scheduled exactly once across the fleet.
   */
  public async onModuleInit(): Promise<void> {
    await this._queue.add(
      MAINTENANCE_JOB.CLEANUP_REFRESH_TOKENS,
      {},
      {
        jobId: MAINTENANCE_JOB.CLEANUP_REFRESH_TOKENS,
        removeOnComplete: true,
        removeOnFail: 50,
        repeat: { pattern: MAINTENANCE_CLEANUP_CRON },
      },
    );

    this._logger.log(`Scheduled repeatable job "${MAINTENANCE_JOB.CLEANUP_REFRESH_TOKENS}".`);
  }
}

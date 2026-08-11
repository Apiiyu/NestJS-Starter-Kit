// Constants
import { MAINTENANCE_QUEUE } from './constants/maintenance-queue.constant';

// Modules
import { AuthenticationModule } from '../authentication';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Processors
import { RefreshTokenCleanupProcessor } from './processors/refresh-token-cleanup.processor';

// Services
import { MaintenanceSchedulerService } from './services/maintenance-scheduler.service';

/**
 * @description Scheduled housekeeping — currently purging expired refresh tokens.
 *
 * Exports nothing on purpose: this module is a consumer of other modules, never a dependency
 * of one. Work runs on a BullMQ repeatable job rather than an in-process timer so that N
 * replicas of the application still perform each sweep once.
 */
@Module({
  imports: [BullModule.registerQueue({ name: MAINTENANCE_QUEUE }), AuthenticationModule],
  providers: [RefreshTokenCleanupProcessor, MaintenanceSchedulerService],
})
export class MaintenanceModule {}

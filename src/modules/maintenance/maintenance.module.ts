// Constants
import { MAINTENANCE_QUEUE } from './constants/maintenance-queue.constant';

// Modules
import { AuthenticationModule } from '../authentication/authentication.module';

// NestJS Libraries
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

// Processors
import { RefreshTokenCleanupProcessor } from './processors/refresh-token-cleanup.processor';

// Services
import { MaintenanceSchedulerService } from './services/maintenance-scheduler.service';

@Module({
  imports: [BullModule.registerQueue({ name: MAINTENANCE_QUEUE }), AuthenticationModule],
  providers: [RefreshTokenCleanupProcessor, MaintenanceSchedulerService],
})
export class MaintenanceModule {}

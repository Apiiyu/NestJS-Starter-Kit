// Controllers
import { HealthController } from './health.controller';

// NestJS Libraries
import { Module } from '@nestjs/common';

// Terminus
import { TerminusModule } from '@nestjs/terminus';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

// Controllers
import { HealthController } from './health.controller';

// NestJS Libraries
import { Module } from '@nestjs/common';

// Terminus
import { TerminusModule } from '@nestjs/terminus';

/**
 * @description Wires Terminus and the health controller so the probe endpoints exist.
 *
 * It exports nothing: health checking is an edge concern, and a feature module that wants to
 * know whether the database is reachable should query it, not ask a probe.
 */
@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}

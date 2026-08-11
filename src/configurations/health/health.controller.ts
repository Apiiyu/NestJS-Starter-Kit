// NestJS Libraries
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';

// Swagger
import { ApiOperation, ApiTags } from '@nestjs/swagger';

// Terminus
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

/**
 * @description Exposes the liveness and readiness probes an orchestrator polls.
 *
 * `VERSION_NEUTRAL` on purpose: probe URLs are configured in deployment manifests, and moving
 * them under `/v1` would break every existing manifest the day a second API version ships.
 */
@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly _health: HealthCheckService,
    private readonly _db: TypeOrmHealthIndicator,
  ) {}

  /**
   * @description Alias for the readiness probe, so `/health` on its own answers something
   * useful.
   *
   * Delegates rather than duplicating: two probes that could drift apart would eventually
   * disagree about whether the service is ready, and each would have half the traffic.
   */
  @Get()
  @HealthCheck()
  @ApiOperation({
    summary: 'Check service readiness',
    description: 'Alias for the database-backed readiness probe.',
  })
  public check() {
    return this.ready();
  }

  /**
   * @description Reports that the process is up, checking no dependency.
   *
   * Deliberately shallow. A liveness probe that touched the database would have the orchestrator
   * restart every replica during a database outage — turning a recoverable incident into a
   * restart loop that guarantees no replica is ready when the database returns.
   */
  @Get('live')
  @ApiOperation({
    summary: 'Check process liveness',
    description: 'Reports whether the application process is running and accepting requests.',
  })
  public live() {
    return {
      message: 'Service is live',
      result: {
        status: 'ok',
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * @description Public and unauthenticated by design — k8s readiness probes must
   * never need credentials. Heap/RSS numbers used to ride along here (F13); dropped
   * because a probe payload is not the place for server load metrics, and neither
   * memory figure is even readiness-relevant — a full-memory process can still be
   * serving traffic fine. Detailed resource metrics belong behind Phase 4's
   * authenticated `/metrics` endpoint (D12), not this one.
   *
   * Wrapped in `{ message, result }` like every other controller in this codebase —
   * `CustomBaseResponseInterceptor` reads `response.result` into the envelope's `data`
   * field, so returning Terminus's raw check object directly (as this did before) left
   * `data` silently empty on every 200 response.
   */
  @Get('ready')
  @HealthCheck()
  @ApiOperation({
    summary: 'Check database readiness',
    description: 'Reports whether the service can reach its PostgreSQL database.',
  })
  public async ready() {
    const result = await this._health.check([() => this._db.pingCheck('database')]);

    return { message: 'Service is healthy', result };
  }
}

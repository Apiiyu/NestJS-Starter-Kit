// NestJS Libraries
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Terminus
import { HealthCheck, HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly _health: HealthCheckService,
    private readonly _db: TypeOrmHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public check() {
    return this.ready();
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
  public async ready() {
    const result = await this._health.check([() => this._db.pingCheck('database')]);

    return { message: 'Service is healthy', result };
  }

  @Get('live')
  public live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

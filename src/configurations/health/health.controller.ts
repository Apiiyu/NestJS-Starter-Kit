// NestJS Libraries
import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

// Terminus
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly _health: HealthCheckService,
    private readonly _db: TypeOrmHealthIndicator,
    private readonly _memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  public check() {
    return this.ready();
  }

  @Get('ready')
  @HealthCheck()
  public ready() {
    return this._health.check([
      () => this._db.pingCheck('database'),
      () => this._memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this._memory.checkRSS('memory_rss', 512 * 1024 * 1024),
    ]);
  }

  @Get('live')
  public live() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

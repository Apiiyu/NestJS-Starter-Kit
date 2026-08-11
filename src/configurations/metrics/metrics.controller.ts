// Guards
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

// NestJS Libraries
import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';

// Services
import { PrometheusMetricsService } from './prometheus-metrics.service';

// Swagger
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * @description Serves the Prometheus scrape endpoint, behind a static API key.
 *
 * `@ApiExcludeController` keeps it out of the public contract: it is an operational surface, not
 * part of the API clients are generated against, and publishing it would only advertise a second
 * credential path.
 */
@ApiExcludeController()
@Controller('metrics')
@UseGuards(ApiKeyGuard)
export class MetricsController {
  constructor(private readonly _metricsService: PrometheusMetricsService) {}

  /**
   * @description Serves the Prometheus scrape endpoint, guarded by a static API key.
   *
   * Returns a `StreamableFile` rather than a plain string so the response bypasses the global
   * envelope interceptor: a scraper expects the bare text exposition format, and wrapping it
   * in `{ statusCode, message, data }` would make the endpoint unparseable to Prometheus.
   */
  @Get()
  public async getMetrics(): Promise<StreamableFile> {
    const payload = await this._metricsService.render();

    return new StreamableFile(Buffer.from(payload), {
      type: this._metricsService.contentType,
    });
  }
}

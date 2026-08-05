// Guards
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

// NestJS Libraries
import { Controller, Get, StreamableFile, UseGuards } from '@nestjs/common';

// Services
import { PrometheusMetricsService } from './prometheus-metrics.service';

// Swagger
import { ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@Controller('metrics')
@UseGuards(ApiKeyGuard)
export class MetricsController {
  constructor(private readonly _metricsService: PrometheusMetricsService) {}

  @Get()
  public async getMetrics(): Promise<StreamableFile> {
    const payload = await this._metricsService.render();

    return new StreamableFile(Buffer.from(payload), {
      type: this._metricsService.contentType,
    });
  }
}

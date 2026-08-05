// NestJS Libraries
import { StreamableFile } from '@nestjs/common';

// Controllers
import { MetricsController } from './metrics.controller';

// Services
import type { PrometheusMetricsService } from './prometheus-metrics.service';

describe('MetricsController', () => {
  it('returns the Prometheus payload as a raw stream with its exposition content type', async () => {
    const metricsService = {
      contentType: 'text/plain; version=0.0.4; charset=utf-8',
      render: jest.fn().mockResolvedValue('# HELP process_cpu_seconds Total user CPU time.\n'),
    } as unknown as PrometheusMetricsService;
    const controller = new MetricsController(metricsService);

    const result = await controller.getMetrics();

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getHeaders()).toMatchObject({ type: metricsService.contentType });
    expect(metricsService.render).toHaveBeenCalledTimes(1);
  });
});

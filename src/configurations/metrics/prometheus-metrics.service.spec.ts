// Services
import { PrometheusMetricsService } from './prometheus-metrics.service';

describe('PrometheusMetricsService', () => {
  it('renders Node process metrics in the Prometheus exposition format', async () => {
    const service = new PrometheusMetricsService();

    const output = await service.render();

    expect(service.contentType).toContain('text/plain');
    expect(output).toContain('# HELP process_cpu_user_seconds_total');
    expect(output).toContain('process_cpu_user_seconds_total');
  });
});

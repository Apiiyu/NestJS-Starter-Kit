// NestJS Libraries
import { Injectable } from '@nestjs/common';

// Prometheus
import { collectDefaultMetrics, Registry } from 'prom-client';

/**
 * @description Owns the Prometheus registry and the default process metrics collected into it.
 *
 * A private `Registry` instance rather than prom-client's global one, so metrics registered by
 * a library that happens to be loaded cannot appear on this endpoint, and two tests can build
 * the service without colliding on duplicate metric names in shared global state.
 */
@Injectable()
export class PrometheusMetricsService {
  private readonly _registry = new Registry();

  constructor() {
    collectDefaultMetrics({ register: this._registry });
  }

  public get contentType(): string {
    return this._registry.contentType;
  }

  /**
   * @description Renders the current metric values in the Prometheus text exposition format,
   * ready to be written straight to a scrape response.
   */
  public render(): Promise<string> {
    return this._registry.metrics();
  }
}

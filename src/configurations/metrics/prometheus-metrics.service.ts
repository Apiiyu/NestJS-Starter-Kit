// NestJS Libraries
import { Injectable } from '@nestjs/common';

// Prometheus
import { collectDefaultMetrics, Registry } from 'prom-client';

@Injectable()
export class PrometheusMetricsService {
  private readonly _registry = new Registry();

  constructor() {
    collectDefaultMetrics({ register: this._registry });
  }

  public get contentType(): string {
    return this._registry.contentType;
  }

  public render(): Promise<string> {
    return this._registry.metrics();
  }
}

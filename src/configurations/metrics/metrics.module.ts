// Controllers
import { MetricsController } from './metrics.controller';

// Guards
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

// Modules
import { AppConfigurationModule } from '../app/app-configuration.module';

// NestJS Libraries
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

// Services
import { PrometheusMetricsService } from './prometheus-metrics.service';

// Strategies
import { ApiKeyStrategy } from '../../common/strategies/api-key.strategy';

/**
 * @description Wires the Prometheus registry, the scrape endpoint, and the API-key strategy
 * that protects it.
 *
 * The guard and strategy are provided here rather than globally so that only this endpoint
 * accepts a static API key. Making key auth application-wide would give every route a second
 * credential path that bypasses JWT entirely.
 */
@Module({
  imports: [AppConfigurationModule, PassportModule],
  controllers: [MetricsController],
  providers: [ApiKeyGuard, ApiKeyStrategy, PrometheusMetricsService],
})
export class MetricsModule {}

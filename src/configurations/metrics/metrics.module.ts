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

@Module({
  imports: [AppConfigurationModule, PassportModule],
  controllers: [MetricsController],
  providers: [ApiKeyGuard, ApiKeyStrategy, PrometheusMetricsService],
})
export class MetricsModule {}

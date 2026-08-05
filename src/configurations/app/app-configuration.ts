import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  appName: process.env.APP_NAME,
  appHost: process.env.APP_HOST,
  appEnv: process.env.APP_ENV,
  appPort: process.env.APP_PORT,
  apiExternalBaseUrl: process.env.API_EXTERNAL_BASE_URL,
  appCorsOrigins: process.env.APP_CORS_ORIGINS,
  appTrustProxy: process.env.APP_TRUST_PROXY,
  metricsApiKey: process.env.METRICS_API_KEY,
  otelEnabled: process.env.OTEL_ENABLED,
  otelMetricsEnabled: process.env.OTEL_METRICS_ENABLED,
  otelExportInterval: process.env.OTEL_EXPORT_INTERVAL,
  throttleTtl: process.env.THROTTLE_TTL,
  throttleLimit: process.env.THROTTLE_LIMIT,
}));

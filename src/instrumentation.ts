import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';

const isTelemetryEnabled = process.env.OTEL_ENABLED === 'true';
const isMetricsEnabled = process.env.OTEL_METRICS_ENABLED !== 'false';
const exportIntervalMillis = Number.parseInt(process.env.OTEL_EXPORT_INTERVAL ?? '30000', 10);

const buildOtlpUrl = (
  endpoint: string | undefined,
  signalEndpoint: string | undefined,
  path: 'metrics' | 'traces',
): string | undefined => {
  if (signalEndpoint && signalEndpoint.trim().length > 0) {
    return signalEndpoint;
  }

  if (!endpoint || endpoint.trim().length === 0) {
    return undefined;
  }

  return `${endpoint.replace(/\/$/, '')}/v1/${path}`;
};

const resolveLogLevel = (logLevel: string | undefined): DiagLogLevel => {
  if (logLevel === 'debug') {
    return DiagLogLevel.DEBUG;
  }

  if (logLevel === 'error') {
    return DiagLogLevel.ERROR;
  }

  if (logLevel === 'warn') {
    return DiagLogLevel.WARN;
  }

  return DiagLogLevel.INFO;
};

let sdk: NodeSDK | undefined;

if (isTelemetryEnabled) {
  process.env.OTEL_SERVICE_NAME ??= process.env.APP_NAME ?? 'nestjs-starter-kit';

  diag.setLogger(new DiagConsoleLogger(), resolveLogLevel(process.env.OTEL_LOG_LEVEL));

  const traceExporter = new OTLPTraceExporter({
    url: buildOtlpUrl(
      process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
      'traces',
    ),
  });

  const metricReader = isMetricsEnabled
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: buildOtlpUrl(
            process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
            process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT,
            'metrics',
          ),
        }),
        exportIntervalMillis: Number.isNaN(exportIntervalMillis) ? 30000 : exportIntervalMillis,
      })
    : undefined;

  sdk = new NodeSDK({
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
    metricReader,
    traceExporter,
  });

  void sdk.start();

  const shutdown = async () => {
    if (!sdk) {
      return;
    }

    await sdk.shutdown();
    sdk = undefined;
  };

  process.once('SIGINT', () => {
    void shutdown();
  });

  process.once('SIGTERM', () => {
    void shutdown();
  });
}

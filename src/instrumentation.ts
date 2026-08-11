// OpenTelemetry
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

/*
 * Everything here reads `process.env` directly rather than going through the config services.
 * It has to: this module runs before Nest exists, because OpenTelemetry can only patch a
 * library it loads first, and `AppModule` pulls in every library worth patching.
 */

/** @description Whether tracing is on. Opt-in, so an unconfigured deployment stays silent. */
const isTelemetryEnabled = process.env.OTEL_ENABLED === 'true';

/**
 * @description Whether metric export is on, given telemetry is enabled.
 *
 * Opt-out rather than opt-in — anyone who turned telemetry on wants metrics unless they say
 * otherwise, and this exists so traces can be kept while a noisy metrics pipeline is silenced.
 */
const isMetricsEnabled = process.env.OTEL_METRICS_ENABLED !== 'false';

/** @description How often metrics are pushed to the collector, in milliseconds. */
const exportIntervalMillis = Number.parseInt(process.env.OTEL_EXPORT_INTERVAL ?? '30000', 10);

/**
 * @description Works out the endpoint for one signal, preferring a signal-specific override
 * over the shared base endpoint.
 *
 * The two forms exist because the OTLP convention allows either: one base URL that each signal
 * appends its own path to, or a fully-specified URL per signal. Supporting both is what lets
 * traces and metrics be sent to different collectors without a second configuration scheme.
 */
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

/**
 * @description Maps the configured log level onto OpenTelemetry's own diagnostic level,
 * defaulting to INFO for anything unrecognised.
 *
 * These are the SDK's *internal* logs — export failures and misconfiguration — not application
 * logs. Turning them up is usually the only way to find out why spans are not arriving.
 */
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

/**
 * @description The OpenTelemetry SDK, left undefined when telemetry is disabled.
 *
 * Undefined rather than a no-op instance so that a disabled deployment pays nothing at all —
 * no exporters, no periodic reader, no auto-instrumentation wrapping every library call.
 */
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

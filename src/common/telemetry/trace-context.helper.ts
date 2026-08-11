// OpenTelemetry
import { context, isSpanContextValid, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

/**
 * @description The trace and span IDs of an active span, both absent when there is none.
 *
 * Optional rather than defaulted, because "no trace" and "trace zero" must not look alike in a
 * log line — the first is normal when telemetry is off, the second would be a real span.
 */
export interface ITraceIdentifiers {
  spanId?: string;
  traceId?: string;
}

/**
 * @description Extracts the trace and span IDs from a span, returning an empty object when the
 * span is missing or its context is invalid.
 *
 * The validity check is what keeps all-zero placeholder IDs — which the SDK produces when
 * nothing is recording — out of the logs, where they would look like a real trace to correlate
 * against.
 *
 * @param span The span to read, or undefined.
 */
export const getTraceIdentifiers = (span: Span | undefined): ITraceIdentifiers => {
  const spanContext = span?.spanContext();

  if (!spanContext || !isSpanContextValid(spanContext)) {
    return {};
  }

  return {
    spanId: spanContext.spanId,
    traceId: spanContext.traceId,
  };
};

/**
 * @description The trace and span IDs of whatever span is active right now, for callers that
 * only want to enrich a log line and have no span reference of their own.
 */
export const getActiveTraceIdentifiers = (): ITraceIdentifiers =>
  getTraceIdentifiers(trace.getSpan(context.active()));

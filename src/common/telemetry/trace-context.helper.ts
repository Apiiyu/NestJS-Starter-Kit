// OpenTelemetry
import { context, isSpanContextValid, trace } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

export interface ITraceIdentifiers {
  spanId?: string;
  traceId?: string;
}

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

export const getActiveTraceIdentifiers = (): ITraceIdentifiers =>
  getTraceIdentifiers(trace.getSpan(context.active()));

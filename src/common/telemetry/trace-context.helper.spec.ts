// OpenTelemetry
import type { Span } from '@opentelemetry/api';

// Helpers
import { getTraceIdentifiers } from './trace-context.helper';

const TRACE_ID = '0123456789abcdef0123456789abcdef';
const SPAN_ID = '0123456789abcdef';

const spanWithIdentifiers = (traceId: string, spanId: string): Span =>
  ({
    spanContext: () => ({
      isRemote: false,
      spanId,
      traceFlags: 1,
      traceId,
    }),
  }) as Span;

describe('getTraceIdentifiers', () => {
  it('returns identifiers from a valid OpenTelemetry span', () => {
    expect(getTraceIdentifiers(spanWithIdentifiers(TRACE_ID, SPAN_ID))).toEqual({
      spanId: SPAN_ID,
      traceId: TRACE_ID,
    });
  });

  it.each([
    ['no span', undefined],
    ['an all-zero trace id', spanWithIdentifiers('0'.repeat(32), SPAN_ID)],
    ['an all-zero span id', spanWithIdentifiers(TRACE_ID, '0'.repeat(16))],
  ])('returns no log fields for %s', (_label, span) => {
    expect(getTraceIdentifiers(span)).toEqual({});
  });
});

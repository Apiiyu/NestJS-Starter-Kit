/* eslint-disable no-console -- Build-time CLI, not server code: the terminal output *is*
   its interface. The rule stays on everywhere else, where a console call would be a
   logger bypass. */

/**
 * @description Coverage ratchet — a one-way gate that lets coverage rise and refuses to
 * let it fall.
 *
 * This is deliberately NOT a replacement for jest's own `coverageThreshold` in
 * `package.json`. That threshold is a coarse floor somebody picked once and nobody
 * revisits; when coverage drifts up to 91% it keeps happily passing a 85% bar, so the
 * next commit is free to give all six points back. This script closes that gap: the bar
 * is always "whatever we achieved last time", stored in a committed baseline.
 *
 * The baseline lives at the repo root rather than under `coverage/` because `/coverage`
 * is gitignored — a baseline in there would be absent on every fresh checkout and CI
 * would silently re-establish it from the current run, which is a ratchet that never
 * ratchets.
 *
 * Usage:
 *   bun run coverage:ratchet          verify, and write the baseline upward on improvement
 *   bun run coverage:ratchet --check  verify only; never writes (for read-only CI stages)
 */

// Node.js
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const BASELINE_PATH = path.resolve(import.meta.dirname, '../coverage-baseline.json');
const SUMMARY_PATH = path.resolve(import.meta.dirname, '../coverage/coverage-summary.json');

/**
 * Istanbul reports percentages rounded to two decimals, so two runs over identical code
 * can still differ in the last bit through pure floating-point noise. Failing a build on
 * a 0.001-point "regression" would teach everyone to ignore this gate, which is worse
 * than not having it. Anything smaller than this is treated as unchanged; anything larger
 * is a real movement of at least one covered branch in a suite this size.
 */
const TOLERANCE = 0.01;

const METRICS = ['branches', 'functions', 'lines', 'statements'] as const;

type Metric = (typeof METRICS)[number];

/**
 * A Map, not a record. Every read here is keyed by a variable walked out of METRICS, and
 * indexing an object that way is indistinguishable — to a reader or to the linter — from
 * indexing it with something untrusted. The JSON on disk is still a plain object; the
 * conversion happens at that boundary and nowhere else.
 */
type CoverageBaseline = Map<Metric, number>;

interface IRegression {
  baseline: number;
  current: number;
  metric: Metric;
}

/**
 * @description Fail with an operator-facing message instead of a stack trace.
 *
 * Every failure mode here has an obvious remedy the developer can act on, so the message
 * carries the remedy. A raw `JSON.parse` throw would tell them a byte offset.
 */
const die = (message: string): never => {
  console.error(`✖ coverage-ratchet: ${message}`);
  process.exit(1);
};

const readJsonFile = (filePath: string, label: string): unknown => {
  let rawContent: string;

  try {
    rawContent = readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    return die(`could not read ${label} at ${filePath}: ${(error as Error).message}`);
  }

  try {
    return JSON.parse(rawContent);
  } catch (error: unknown) {
    return die(`${label} at ${filePath} is not valid JSON: ${(error as Error).message}`);
  }
};

/**
 * @description Pull the four percentages out of an object, rejecting anything that is not
 * a finite 0-100 number.
 *
 * Istanbul emits `pct: "Unknown"` when a metric has zero total entries, and a summary
 * truncated by a crashed run can be missing keys entirely. Both must fail loudly here
 * rather than silently coercing to `NaN` and making every later comparison false, which
 * would turn the gate into a no-op that still exits 0.
 */
const extractMetrics = (source: unknown, label: string, readPct: boolean): CoverageBaseline => {
  if (typeof source !== 'object' || source === null) {
    return die(`${label} is not an object.`);
  }

  const entries = new Map(Object.entries(source as Record<string, unknown>));
  const extracted: CoverageBaseline = new Map();

  for (const metric of METRICS) {
    const rawEntry = entries.get(metric);
    const rawValue = readPct ? (rawEntry as Record<string, unknown> | undefined)?.pct : rawEntry;

    if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) {
      return die(
        `${label} is missing a usable "${metric}" percentage (got ${JSON.stringify(rawValue)}). ` +
          `Re-run \`bun run test:cov\` and try again.`,
      );
    }

    if (rawValue < 0 || rawValue > 100) {
      return die(`${label} reports "${metric}" as ${rawValue}, which is not a percentage.`);
    }

    extracted.set(metric, rawValue);
  }

  return extracted;
};

/**
 * Every metric is proven present by `extractMetrics` before a baseline exists, so a miss
 * here is a bug in this file rather than bad input — hence a throw, not a `die` with a
 * remedy the developer cannot act on.
 */
const metricValue = (coverage: CoverageBaseline, metric: Metric): number => {
  const value = coverage.get(metric);

  if (value === undefined) {
    throw new Error(`coverage-ratchet: "${metric}" missing from a validated coverage set.`);
  }

  return value;
};

const readCurrentCoverage = (): CoverageBaseline => {
  if (!existsSync(SUMMARY_PATH)) {
    return die(
      `no coverage summary at ${SUMMARY_PATH}. Run \`bun run test:cov\` first — it writes ` +
        `coverage-summary.json via the "json-summary" reporter.`,
    );
  }

  const summary = readJsonFile(SUMMARY_PATH, 'coverage summary');

  if (typeof summary !== 'object' || summary === null || !('total' in summary)) {
    return die(`coverage summary at ${SUMMARY_PATH} has no "total" block.`);
  }

  return extractMetrics((summary as { total: unknown }).total, 'coverage summary "total"', true);
};

const readBaseline = (): CoverageBaseline | null => {
  if (!existsSync(BASELINE_PATH)) {
    return null;
  }

  return extractMetrics(
    readJsonFile(BASELINE_PATH, 'coverage baseline'),
    'coverage baseline',
    false,
  );
};

const writeBaseline = (baseline: CoverageBaseline): void => {
  // Sorted keys and a trailing newline keep the committed diff to the lines that actually
  // moved, rather than reordering the file on every write.
  const serialised = JSON.stringify(
    Object.fromEntries(METRICS.map((metric) => [metric, metricValue(baseline, metric)])),
    null,
    2,
  );

  writeFileSync(BASELINE_PATH, `${serialised}\n`, 'utf8');
};

const findRegressions = (baseline: CoverageBaseline, current: CoverageBaseline): IRegression[] =>
  METRICS.filter(
    (metric) => metricValue(current, metric) < metricValue(baseline, metric) - TOLERANCE,
  ).map((metric) => ({
    baseline: metricValue(baseline, metric),
    current: metricValue(current, metric),
    metric,
  }));

const findImprovements = (baseline: CoverageBaseline, current: CoverageBaseline): Metric[] =>
  METRICS.filter(
    (metric) => metricValue(current, metric) > metricValue(baseline, metric) + TOLERANCE,
  );

const formatRow = (metric: Metric, value: number): string =>
  `  ${metric.padEnd(11)} ${value.toFixed(2)}%`;

const main = (): void => {
  const isCheckOnly = process.argv.includes('--check');
  const current = readCurrentCoverage();
  const baseline = readBaseline();

  if (!baseline) {
    if (isCheckOnly) {
      die(
        `no baseline at ${BASELINE_PATH} and --check forbids creating one. ` +
          `Run \`bun run coverage:ratchet\` without --check to establish it, then commit the file.`,
      );

      return;
    }

    writeBaseline(current);
    console.log(`✔ coverage-ratchet: established a new baseline at ${BASELINE_PATH}`);
    console.log(
      METRICS.map((metric) => formatRow(metric, metricValue(current, metric))).join('\n'),
    );
    console.log('  Commit this file so future runs have something to ratchet against.');

    return;
  }

  const regressions = findRegressions(baseline, current);

  if (regressions.length > 0) {
    console.error(`✖ coverage-ratchet: coverage dropped below the committed baseline.`);

    for (const regression of regressions) {
      const delta = (regression.baseline - regression.current).toFixed(2);

      console.error(
        `  ${regression.metric.padEnd(11)} ${regression.current.toFixed(2)}% < ` +
          `${regression.baseline.toFixed(2)}% (down ${delta} points)`,
      );
    }

    console.error(
      '  Add tests for the new code, or justify the drop and lower coverage-baseline.json ' +
        'in the same commit so the decision is reviewable.',
    );
    process.exit(1);
  }

  const improvements = findImprovements(baseline, current);

  if (improvements.length === 0) {
    console.log('✔ coverage-ratchet: coverage holds at the baseline.');
    console.log(
      METRICS.map((metric) => formatRow(metric, metricValue(current, metric))).join('\n'),
    );

    return;
  }

  if (isCheckOnly) {
    console.log('✔ coverage-ratchet: coverage improved (baseline left untouched by --check).');
  } else {
    // Only the improved metrics move. Copying `current` wholesale would also drag any
    // metric that fell inside TOLERANCE downward, letting coverage erode a hundredth at a
    // time across many commits — a ratchet that leaks.
    const nextBaseline = new Map(baseline);

    for (const metric of improvements) {
      nextBaseline.set(metric, metricValue(current, metric));
    }

    writeBaseline(nextBaseline);
    console.log(`✔ coverage-ratchet: coverage improved — baseline raised in ${BASELINE_PATH}`);
  }

  for (const metric of improvements) {
    const baselineValue = metricValue(baseline, metric);
    const currentValue = metricValue(current, metric);
    const delta = (currentValue - baselineValue).toFixed(2);

    console.log(
      `  ${metric.padEnd(11)} ${baselineValue.toFixed(2)}% → ${currentValue.toFixed(2)}% ` +
        `(up ${delta} points)`,
    );
  }
};

main();

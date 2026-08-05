/* eslint-disable no-console -- Build-time CLI, not server code: the terminal output *is*
   its interface. The rule stays on everywhere else, where a console call would be a
   logger bypass. */

/**
 * @description Fail CI on any high or critical advisory that has not been explicitly
 * triaged.
 *
 * `bun audit --audit-level=high` on its own is not usable as a gate here: the tree
 * currently carries advisories whose only fix is a cross-major bump of a build-tooling
 * transitive, so a bare audit would leave CI permanently red and everyone would learn to
 * ignore it. The opposite failure — dropping the audit to a non-blocking informational
 * step — means a genuinely new vulnerability lands with nothing but a green check beside
 * it.
 *
 * This gate takes the third option. Every known advisory is written down in
 * `audit-allowlist.json` with the reason it is tolerated and a date by which it must be
 * revisited. Anything *not* on that list fails the build immediately, which is the case
 * that actually matters: a vulnerability introduced by the change under review.
 *
 * Three failure modes, all deliberate:
 *
 * - An un-allowlisted high/critical advisory fails. This is the point of the gate.
 * - An allowlisted entry past its `expires` date fails. Without this the allowlist
 *   becomes a place where security debt goes to be forgotten; the expiry forces the
 *   decision to be re-made rather than inherited.
 * - An allowlist entry matching nothing fails. A stale exemption is a silent hole: it
 *   would keep suppressing the advisory if it ever came back.
 *
 * Usage:
 *   bun run audit:ci
 */

// Node.js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ALLOWLIST_PATH = path.resolve(import.meta.dirname, '../audit-allowlist.json');

const BLOCKING_SEVERITIES = new Set(['critical', 'high']);

interface IAdvisory {
  id: number;
  severity: string;
  title: string;
  url: string;
  vulnerable_versions: string;
}

interface IAllowlistEntry {
  expires: string;
  package: string;
  reason: string;
}

interface IFinding {
  ghsaId: string;
  packageName: string;
  severity: string;
  title: string;
}

const die = (message: string): never => {
  console.error(`✖ audit-gate: ${message}`);
  process.exit(1);
};

/**
 * @description Read the advisory report from `bun audit --json`.
 *
 * `bun audit` exits non-zero whenever it finds anything at all, so its exit code carries
 * no information this script can act on — the severity filtering and allowlisting happen
 * here. Only a failure to produce parseable JSON is treated as an error, because that
 * means the audit did not actually run, and reporting a clean tree on silence would be a
 * false green.
 */
const readAuditReport = (): Record<string, IAdvisory[]> => {
  const result = spawnSync('bun', ['audit', '--json'], {
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    return die(`could not run \`bun audit\`: ${result.error.message}`);
  }

  const stdout = result.stdout.trim();

  if (stdout.length === 0) {
    return die(
      '`bun audit --json` produced no output. Refusing to report a clean tree on silence. ' +
        `stderr was: ${result.stderr.trim() || '(empty)'}`,
    );
  }

  try {
    return JSON.parse(stdout) as Record<string, IAdvisory[]>;
  } catch (error: unknown) {
    return die(`\`bun audit --json\` output is not parseable: ${(error as Error).message}`);
  }
};

const readAllowlist = (): Map<string, IAllowlistEntry> => {
  let rawContent: string;

  try {
    rawContent = readFileSync(ALLOWLIST_PATH, 'utf8');
  } catch (error: unknown) {
    return die(`could not read the allowlist at ${ALLOWLIST_PATH}: ${(error as Error).message}`);
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawContent);
  } catch (error: unknown) {
    return die(`${ALLOWLIST_PATH} is not valid JSON: ${(error as Error).message}`);
  }

  const advisories = (parsed as { advisories?: unknown }).advisories;

  if (typeof advisories !== 'object' || advisories === null) {
    return die(`${ALLOWLIST_PATH} has no "advisories" object.`);
  }

  const entries = new Map(Object.entries(advisories as Record<string, Partial<IAllowlistEntry>>));

  for (const [ghsaId, entry] of entries) {
    // An exemption without a reason and an expiry is just a suppression. Rejecting it
    // here keeps the file reviewable: every line has to say why, and until when. The
    // fields are destructured rather than walked by name so nothing indexes by variable.
    const { expires, package: packageName, reason } = entry;

    for (const [field, value] of [
      ['expires', expires],
      ['package', packageName],
      ['reason', reason],
    ] as const) {
      if (typeof value !== 'string' || value.length === 0) {
        die(`allowlist entry "${ghsaId}" is missing a "${field}".`);
      }
    }

    if (Number.isNaN(Date.parse(expires as string))) {
      die(`allowlist entry "${ghsaId}" has an unparseable expires date "${expires}".`);
    }
  }

  return entries as Map<string, IAllowlistEntry>;
};

/** GHSA ids are the stable identifier across registries; the numeric `id` is not. */
const toGhsaId = (advisory: IAdvisory): string => advisory.url.split('/').pop() ?? advisory.url;

const collectBlockingFindings = (report: Record<string, IAdvisory[]>): IFinding[] => {
  const findings: IFinding[] = [];

  for (const [packageName, advisories] of Object.entries(report)) {
    if (!Array.isArray(advisories)) {
      continue;
    }

    for (const advisory of advisories) {
      if (!BLOCKING_SEVERITIES.has(advisory.severity)) {
        continue;
      }

      findings.push({
        ghsaId: toGhsaId(advisory),
        packageName,
        severity: advisory.severity,
        title: advisory.title,
      });
    }
  }

  return findings;
};

const main = (): void => {
  const allowlist = readAllowlist();
  const findings = collectBlockingFindings(readAuditReport());

  const seenGhsaIds = new Set(findings.map((finding) => finding.ghsaId));
  const unexpected = findings.filter((finding) => !allowlist.has(finding.ghsaId));

  const today = new Date();
  const expired = [...allowlist].filter(
    ([ghsaId, entry]) => seenGhsaIds.has(ghsaId) && new Date(entry.expires) < today,
  );
  const stale = [...allowlist.keys()].filter((ghsaId) => !seenGhsaIds.has(ghsaId));

  if (unexpected.length > 0) {
    console.error(`✖ audit-gate: ${unexpected.length} un-triaged high/critical advisory(ies).`);

    for (const finding of unexpected) {
      console.error(`  ${finding.severity.padEnd(8)} ${finding.packageName} — ${finding.title}`);
      console.error(`           ${finding.ghsaId}`);
    }

    console.error(
      '\n  Fix it, or add it to audit-allowlist.json with a reason and an expiry date\n' +
        '  in the same commit, so the decision to tolerate it stays reviewable.',
    );
  }

  if (expired.length > 0) {
    console.error(`\n✖ audit-gate: ${expired.length} allowlist entry(ies) are past their expiry.`);

    for (const [ghsaId, entry] of expired) {
      console.error(`  ${ghsaId} (${entry.package}) expired ${entry.expires}`);
    }

    console.error('\n  Re-check whether a fix exists now, then either fix it or extend the date.');
  }

  if (stale.length > 0) {
    console.error(`\n✖ audit-gate: ${stale.length} allowlist entry(ies) no longer match anything.`);

    for (const ghsaId of stale) {
      console.error(`  ${ghsaId} (${allowlist.get(ghsaId)?.package})`);
    }

    console.error(
      '\n  Remove them. A stale exemption silently re-suppresses the advisory if it ever\n' +
        '  returns.',
    );
  }

  if (unexpected.length > 0 || expired.length > 0 || stale.length > 0) {
    process.exit(1);
  }

  console.log(
    `✔ audit-gate: no un-triaged high/critical advisories ` +
      `(${findings.length} finding(s), all allowlisted).`,
  );
};

main();

/* eslint-disable no-console -- Build-time CLI, not server code: the terminal output *is*
   its interface. The rule stays on everywhere else, where a console call would be a
   logger bypass. */

/**
 * @description Emit a CycloneDX 1.6 SBOM for this project from `bun.lock`.
 *
 * Why this is hand-rolled rather than `@cyclonedx/cdxgen` or `@cyclonedx/bun-plugin`:
 *
 * - `@cyclonedx/bun-plugin` is a *bundler* plugin. It describes what `Bun.build()` pulled
 *   into an output bundle, which is not the dependency inventory an SBOM consumer wants,
 *   and this project ships via `nest build` (tsc) rather than Bun's bundler anyway.
 * - `@cyclonedx/cdxgen` was tried and rejected on evidence. With `-t bun` it emitted a
 *   well-formed document containing **zero** components — its bun support looks for the
 *   legacy binary `bun.lockb`, not the text `bun.lock` this repo uses. With `-t js` it did
 *   produce 1354 components, but only by shelling out to **npm** internally (it failed
 *   with `npm error ... Fix the upstream dependency conflict` on the way). This repo is
 *   bun-only with zero exceptions, so a generator that needs npm on the PATH is
 *   disqualified regardless of its output.
 *
 * `bun.lock` already holds the fully resolved graph — exact versions plus registry
 * integrity hashes — so reading it directly is both more accurate and more honest than
 * shelling out: no network, no second package manager, and the SBOM cannot disagree with
 * the lockfile CI actually installed from.
 *
 * Usage:
 *   bun run sbom                  writes sbom.cdx.json
 *   bun run sbom -- --output x    writes to a chosen path
 */

// Node.js
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import process from 'node:process';

const LOCKFILE_PATH = path.resolve(import.meta.dirname, '../bun.lock');
const MANIFEST_PATH = path.resolve(import.meta.dirname, '../package.json');

interface IComponent {
  'bom-ref': string;
  description?: string;
  hashes?: { alg: string; content: string }[];
  name: string;
  purl: string;
  scope: 'optional' | 'required';
  type: 'library';
  version: string;
}

/**
 * The lockfile's `packages` map is `name -> [ "name@version", registry, meta, integrity ]`.
 * Only the first and last slots are load-bearing here; `registry` is frequently `""` and
 * `meta` holds the dependency edges, which an inventory-style SBOM does not need.
 */
type LockfileEntry = [string, string, Record<string, unknown>, string?];

const die = (message: string): never => {
  console.error(`✖ generate-sbom: ${message}`);
  process.exit(1);
};

const readJsonFile = (filePath: string, label: string): unknown => {
  let rawContent: string;

  try {
    rawContent = readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    return die(`could not read ${label} at ${filePath}: ${(error as Error).message}`);
  }

  /**
   * `bun.lock` is JSONC: bun writes trailing commas that `JSON.parse` rejects. Stripping
   * a trailing comma that sits immediately before a closing brace or bracket is safe here
   * because bun never emits string literals containing that exact sequence at the end of a
   * line — and if a future bun version changes the format, the parse below fails loudly
   * rather than producing a half-read graph.
   */
  const normalised = rawContent.replace(/,(\s*[}\]])/g, '$1');

  try {
    return JSON.parse(normalised);
  } catch (error: unknown) {
    return die(`${label} at ${filePath} is not parseable: ${(error as Error).message}`);
  }
};

/**
 * @description Split `name@version` where the name itself may be scoped (`@scope/pkg`).
 *
 * Splitting on the first `@` breaks every scoped package, and scoped packages are the
 * majority of this dependency tree, so the separator is the LAST `@`.
 */
const splitNameAndVersion = (identifier: string): { name: string; version: string } | null => {
  const separatorIndex = identifier.lastIndexOf('@');

  if (separatorIndex <= 0) {
    return null;
  }

  const name = identifier.slice(0, separatorIndex);
  const version = identifier.slice(separatorIndex + 1);

  if (name.length === 0 || version.length === 0) {
    return null;
  }

  return { name, version };
};

/** purl spec requires the `@` of a scope to be percent-encoded; the `/` must not be. */
const toPurl = (name: string, version: string): string =>
  `pkg:npm/${name.replace('@', '%40')}@${version}`;

const toHashes = (
  integrity: string | undefined,
): { alg: string; content: string }[] | undefined => {
  if (!integrity) {
    // Absent for workspace-local and git/tarball dependencies. Omitting `hashes` is valid
    // CycloneDX; inventing one would be worse than saying nothing.
    return undefined;
  }

  const [algorithm, encoded] = integrity.split('-');
  const algorithmByPrefix: Record<string, string> = {
    sha1: 'SHA-1',
    sha256: 'SHA-256',
    sha512: 'SHA-512',
  };
  const alg = algorithmByPrefix[algorithm];

  if (!alg || !encoded) {
    return undefined;
  }

  return [{ alg, content: encoded }];
};

const main = (): void => {
  const outputFlagIndex = process.argv.indexOf('--output');
  const outputPath = path.resolve(
    import.meta.dirname,
    '..',
    outputFlagIndex !== -1 && process.argv[outputFlagIndex + 1]
      ? process.argv[outputFlagIndex + 1]
      : 'sbom.cdx.json',
  );

  const manifest = readJsonFile(MANIFEST_PATH, 'package.json') as {
    dependencies?: Record<string, string>;
    description?: string;
    devDependencies?: Record<string, string>;
    name?: string;
    version?: string;
  };
  const lockfile = readJsonFile(LOCKFILE_PATH, 'bun.lock') as {
    packages?: Record<string, unknown>;
  };

  if (!lockfile.packages || typeof lockfile.packages !== 'object') {
    die('bun.lock has no "packages" map — run `bun install` first.');

    return;
  }

  const productionDependencyNames = new Set(Object.keys(manifest.dependencies ?? {}));
  const components: IComponent[] = [];
  const seenBomRefs = new Set<string>();

  for (const rawEntry of Object.values(lockfile.packages)) {
    if (!Array.isArray(rawEntry)) {
      // Tolerate a shape change rather than crashing the build; the count printed at the
      // end makes a silently-empty SBOM impossible to miss.
      continue;
    }

    const entry = rawEntry as LockfileEntry;
    const parsed = splitNameAndVersion(entry[0]);

    if (!parsed) {
      continue;
    }

    const purl = toPurl(parsed.name, parsed.version);

    if (seenBomRefs.has(purl)) {
      // bun lists the same resolved package under several keys when a transitive dep is
      // deduped; one component per purl is what CycloneDX expects.
      continue;
    }

    seenBomRefs.add(purl);
    components.push({
      'bom-ref': purl,
      hashes: toHashes(entry[3]),
      name: parsed.name,
      purl,
      /**
       * `required` vs `optional` here means "ships in the deployed artifact" vs "build and
       * test only". Anything not named in `dependencies` is dev tooling as far as a
       * downstream vulnerability consumer is concerned.
       */
      scope: productionDependencyNames.has(parsed.name) ? 'required' : 'optional',
      type: 'library',
      version: parsed.version,
    });
  }

  if (components.length === 0) {
    die('bun.lock produced zero components — refusing to write an empty SBOM.');

    return;
  }

  components.sort((left, right) => left.purl.localeCompare(right.purl));

  // An empty string is not a description; CycloneDX would rather the key be absent than
  // present and blank, and `??` alone would let `""` through.
  const trimmedDescription = manifest.description?.trim();

  const sbom = {
    bomFormat: 'CycloneDX',
    components,
    metadata: {
      component: {
        'bom-ref': toPurl(manifest.name ?? 'unknown', manifest.version ?? '0.0.0'),
        description: trimmedDescription === '' ? undefined : trimmedDescription,
        name: manifest.name ?? 'unknown',
        purl: toPurl(manifest.name ?? 'unknown', manifest.version ?? '0.0.0'),
        type: 'application',
        version: manifest.version ?? '0.0.0',
      },
      lifecycles: [{ phase: 'build' }],
      timestamp: new Date().toISOString(),
      tools: {
        components: [
          {
            name: 'generate-sbom.ts',
            type: 'application',
            version: '1.0.0',
          },
        ],
      },
    },
    serialNumber: `urn:uuid:${randomUUID()}`,
    specVersion: '1.6',
    version: 1,
    $schema: 'http://cyclonedx.org/schema/bom-1.6.schema.json',
  };

  writeFileSync(outputPath, `${JSON.stringify(sbom, null, 2)}\n`, 'utf8');

  const requiredCount = components.filter((component) => component.scope === 'required').length;

  console.log(`✔ generate-sbom: wrote ${outputPath}`);
  console.log(
    `  ${components.length} components (${requiredCount} runtime, ` +
      `${components.length - requiredCount} build/test only)`,
  );
};

main();

/* eslint-disable no-console -- Build-time CLI, not server code: the terminal output *is*
   its interface. The rule stays on everywhere else, where a console call would be a
   logger bypass. */

/**
 * @description Validate a generated SBOM against the official CycloneDX 1.6 JSON schema.
 *
 * `scripts/generate-sbom.ts` hand-builds the document, so nothing else proves the output
 * is actually conformant — and an SBOM consumers cannot parse is worse than no SBOM,
 * because a broken file still looks like compliance from the outside. This is the check
 * that makes the generator's output a claim rather than a hope.
 *
 * The upstream `@cyclonedx/cyclonedx-cli` package does not exist on npm (the reference
 * CLI is a .NET binary published through GitHub releases), and `ajv-cli` cannot load its
 * own format plugin when run through `bunx`. Validating in-process with ajv sidesteps
 * both and keeps the failure output readable.
 *
 * The three schemas are fetched from a pinned CycloneDX specification tag rather than
 * vendored: 330KB of third-party schema in the tree would go stale silently, and pinning
 * the tag means the fetch cannot change under us either.
 *
 * Usage:
 *   bun run sbom:validate                 validates sbom.cdx.json
 *   bun run sbom:validate -- --input x    validates a chosen file
 */

// Node.js
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// Validation
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

/**
 * Pinned to a release tag, not `master`. A moving ref would let an upstream schema edit
 * turn a previously-green release red with no change on our side.
 */
const SPEC_TAG = '1.6';
const SCHEMA_BASE = `https://raw.githubusercontent.com/CycloneDX/specification/${SPEC_TAG}/schema`;

const BOM_SCHEMA = 'bom-1.6.schema.json';
/** Referenced by the BOM schema via `$ref`; ajv needs them registered up front. */
const REFERENCED_SCHEMAS = ['jsf-0.82.schema.json', 'spdx.schema.json'];

const die = (message: string): never => {
  console.error(`✖ validate-sbom: ${message}`);
  process.exit(1);
};

const fetchSchema = async (fileName: string): Promise<Record<string, unknown>> => {
  const url = `${SCHEMA_BASE}/${fileName}`;

  let response: Response;

  try {
    response = await fetch(url);
  } catch (error: unknown) {
    return die(`could not fetch ${url}: ${(error as Error).message}`);
  }

  if (!response.ok) {
    return die(`could not fetch ${url}: HTTP ${response.status} ${response.statusText}`);
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error: unknown) {
    return die(`${url} did not return valid JSON: ${(error as Error).message}`);
  }
};

const readSbom = (inputPath: string): unknown => {
  let rawContent: string;

  try {
    rawContent = readFileSync(inputPath, 'utf8');
  } catch (error: unknown) {
    return die(
      `could not read ${inputPath}: ${(error as Error).message}. Run \`bun run sbom\` first.`,
    );
  }

  try {
    return JSON.parse(rawContent);
  } catch (error: unknown) {
    return die(`${inputPath} is not valid JSON: ${(error as Error).message}`);
  }
};

const main = async (): Promise<void> => {
  const inputFlagIndex = process.argv.indexOf('--input');
  const inputPath = path.resolve(
    import.meta.dirname,
    '..',
    inputFlagIndex !== -1 && process.argv[inputFlagIndex + 1]
      ? process.argv[inputFlagIndex + 1]
      : 'sbom.cdx.json',
  );

  const sbom = readSbom(inputPath);

  // `strict: false` because the CycloneDX schema uses keywords ajv would otherwise reject
  // as unknown. This relaxes how the *schema* is read, not how the document is validated
  // against it.
  const ajv = new Ajv({ allErrors: true, strict: false });

  addFormats(ajv);

  for (const fileName of REFERENCED_SCHEMAS) {
    const schema = await fetchSchema(fileName);

    // Registered under the exact filename the BOM schema `$ref`s, which is what the
    // reference resolves against — not under the schema's own $id.
    ajv.addSchema(schema, fileName);
  }

  const validate = ajv.compile(await fetchSchema(BOM_SCHEMA));

  if (validate(sbom)) {
    const componentCount = Array.isArray((sbom as { components?: unknown }).components)
      ? (sbom as { components: unknown[] }).components.length
      : 0;

    console.log(
      `✔ validate-sbom: ${path.basename(inputPath)} is valid CycloneDX ${SPEC_TAG} ` +
        `(${componentCount} components).`,
    );

    return;
  }

  console.error(`✖ validate-sbom: ${inputPath} is not valid CycloneDX ${SPEC_TAG}.`);

  for (const error of validate.errors ?? []) {
    console.error(`  ${error.instancePath || '/'} ${error.message}`);
  }

  process.exit(1);
};

void main();

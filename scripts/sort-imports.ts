/**
 * @description Rewrites the import block of every TypeScript source file into labelled,
 * alphabetically ordered groups. This exists because the convention this project wants —
 * comment-headed groups sorted by their label — sorts on a key that lives inside a comment
 * and cannot be derived from the code, so no off-the-shelf formatter can express it.
 * Run with `--check` to report instead of writing, which is what CI and lint-staged use.
 */

// Node Libraries
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import process from 'node:process';

// TypeScript
import ts from 'typescript';

/**
 * @description Maps a third-party package name to the group label it is filed under.
 * The longest matching prefix wins, so `@nestjs/swagger` is filed under Swagger while any
 * other `@nestjs/*` package falls through to NestJS Libraries.
 */
const PACKAGE_LABELS: ReadonlyArray<readonly [string, string]> = [
  ['@faker-js/faker', 'Testing'],
  ['@keyv/redis', 'Keyv'],
  ['@nestjs/swagger', 'Swagger'],
  ['@nestjs/terminus', 'Terminus'],
  ['@nestjs/throttler', 'Throttler'],
  ['@nestjs', 'NestJS Libraries'],
  ['@opentelemetry', 'OpenTelemetry'],
  ['bcrypt', 'Bcrypt'],
  ['bullmq', 'BullMQ'],
  ['cache-manager', 'Cache Manager'],
  ['chalk', 'Chalk'],
  ['class-transformer', 'Class Transformer'],
  ['class-validator', 'Class Validator'],
  ['compression', 'Compression'],
  ['dotenv', 'Dotenv'],
  ['express', 'Express'],
  ['helmet', 'Helmet'],
  ['ioredis', 'Redis'],
  ['keyv', 'Keyv'],
  ['nestjs-pino', 'Pino'],
  ['node:', 'Node Libraries'],
  ['nodemailer', 'Nodemailer'],
  ['passport', 'Passport'],
  ['pg', 'PostgreSQL'],
  ['pino', 'Pino'],
  ['prom-client', 'Prometheus'],
  ['reflect-metadata', 'Reflect Metadata'],
  ['rxjs', 'RxJS'],
  ['supertest', 'Testing'],
  ['testcontainers', 'Testcontainers'],
  ['typeorm', 'TypeORM'],
  ['typescript', 'TypeScript'],
  ['uuid', 'UUID'],
];

/**
 * @description Maps a local file's naming suffix to its group label. The suffix is a more
 * reliable signal than the folder, because a barrel re-export and the file it re-exports
 * can sit in different directories while meaning the same thing.
 */
const SUFFIX_LABELS: Readonly<Record<string, string>> = {
  configuration: 'Configurations',
  constant: 'Constants',
  // Plural spellings appear where a file collects several values, e.g. mail-queue.constants.
  constants: 'Constants',
  controller: 'Controllers',
  decorator: 'Decorators',
  dto: 'DTOs',
  entity: 'Entities',
  filter: 'Filters',
  guard: 'Guards',
  helper: 'Helpers',
  interceptor: 'Interceptors',
  interface: 'Interfaces',
  interfaces: 'Interfaces',
  middleware: 'Middlewares',
  migration: 'Migrations',
  module: 'Modules',
  pipe: 'Pipes',
  processor: 'Processors',
  provider: 'Providers',
  repository: 'Repositories',
  seeder: 'Seeders',
  service: 'Services',
  setup: 'Setups',
  store: 'Stores',
  strategy: 'Strategies',
  template: 'Templates',
  validation: 'Validations',
};

/** @description Folder names used as a fallback when a file carries no recognised suffix. */
const FOLDER_LABELS: Readonly<Record<string, string>> = {
  bootstrap: 'Bootstrap',
  configurations: 'Configurations',
  constants: 'Constants',
  database: 'Database',
  entities: 'Entities',
  helpers: 'Helpers',
  interfaces: 'Interfaces',
  postgres: 'Database',
  'request-context': 'Request Context',
  strategies: 'Strategies',
  telemetry: 'Telemetry',
  test: 'Testing',
};

/**
 * @description Map views of the two label tables, built once.
 *
 * The lookups take a filename suffix or folder name pulled out of an import specifier. A plain
 * `SUFFIX_LABELS[suffix]` also answers for inherited members, so a file named `constructor.ts`
 * would resolve to a truthy function and be labelled as if it were a permitted entry.
 * `Object.entries` copies own enumerable properties only, so a Map cannot answer for anything
 * the tables do not actually declare.
 */
const SUFFIX_LABEL_LOOKUP = new Map(Object.entries(SUFFIX_LABELS));

/**
 * @description Map view of `FOLDER_LABELS`, for the same reason as `SUFFIX_LABEL_LOOKUP`.
 */
const FOLDER_LABEL_LOOKUP = new Map(Object.entries(FOLDER_LABELS));

/** @description Label used when nothing more specific matches a local import. */
const FALLBACK_LOCAL_LABEL = 'Modules';

/** @description Label used when nothing more specific matches a third-party package. */
const FALLBACK_PACKAGE_LABEL = 'Third Party Libraries';

/**
 * @description Decides whether a comment line is a group header this tool owns, rather than
 * a human explanation that must stay attached to its import. Group headers are short,
 * capitalised, and carry no sentence punctuation — anything else is left untouched.
 */
function isGroupHeader(line: string): boolean {
  const match = /^\/\/\s*([A-Z][A-Za-z0-9 /&.+-]*)$/.exec(line.trim());

  if (!match) {
    return false;
  }

  return match[1].trim().split(/\s+/).length <= 4;
}

/**
 * @description Works out which group label an imported module belongs to, given the path or
 * package name written in the import statement.
 */
function labelFor(specifier: string): string {
  if (!specifier.startsWith('.')) {
    const matches = PACKAGE_LABELS.filter(([prefix]) => specifier.startsWith(prefix)).sort(
      (a, b) => b[0].length - a[0].length,
    );

    return matches.length > 0 ? matches[0][1] : FALLBACK_PACKAGE_LABEL;
  }

  const file = basename(specifier).replace(/\.(ts|js)$/, '');
  const suffix = file.split('.').slice(1).pop();

  const bySuffix = suffix === undefined ? undefined : SUFFIX_LABEL_LOOKUP.get(suffix);

  if (bySuffix !== undefined) {
    return bySuffix;
  }

  const segments = specifier.split('/').filter((segment) => segment !== '.' && segment !== '..');
  const folder = segments[segments.length - 2];

  const byFolder = folder === undefined ? undefined : FOLDER_LABEL_LOOKUP.get(folder);

  if (byFolder !== undefined) {
    return byFolder;
  }

  const singular = folder?.replace(/s$/, '');

  const bySingular = singular === undefined ? undefined : SUFFIX_LABEL_LOOKUP.get(singular);

  if (bySingular !== undefined) {
    return bySingular;
  }

  return FALLBACK_LOCAL_LABEL;
}

/**
 * @description Reads the first name an import statement brings into scope, so two imports
 * from the same module can be ordered by what they pull in. Side-effect-only imports such
 * as `import 'reflect-metadata'` have no name and sort first.
 */
function firstBindingOf(node: ts.ImportDeclaration): string {
  const clause = node.importClause;

  if (clause === undefined) {
    return '';
  }

  if (clause.name !== undefined) {
    return clause.name.text;
  }

  const bindings = clause.namedBindings;

  if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
    return bindings.name.text;
  }

  if (bindings !== undefined && ts.isNamedImports(bindings) && bindings.elements.length > 0) {
    return bindings.elements[0].name.text;
  }

  return '';
}

/**
 * @description Builds the rewritten import block for one file, or returns null when the file
 * has no imports to reorganise. The returned range is the exact region to replace.
 */
function buildImportBlock(
  source: ts.SourceFile,
  text: string,
): { start: number; end: number; block: string } | null {
  const imports = source.statements.filter(ts.isImportDeclaration);

  if (imports.length === 0) {
    return null;
  }

  const first = imports[0];
  // The replaced region starts at the first comment above the first import, not at the
  // first comment worth keeping. Starting later would strand an old group header — whose
  // imports have since moved to another group — above the rewritten block.
  const above = ts.getLeadingCommentRanges(text, first.pos) ?? [];
  const kept = above.filter((range) => !isGroupHeader(text.slice(range.pos, range.end)));
  // A file banner sits above the first import and is therefore also that import's leading
  // comment. Emitting it as the block prefix AND alongside its import would duplicate it.
  const hoisted = new Set(kept.map((range) => range.pos));
  const groups = new Map<string, { key: string; text: string }[]>();
  // A side-effect-only import is executed for what it does, not for what it binds, so its
  // position is semantics rather than presentation. `import './instrumentation'` has to run
  // before anything pulls in @nestjs/core, typeorm, or pg, because OpenTelemetry can only
  // patch a library it loads first; sorting it into a labelled group by its path would put
  // `./app.module` ahead of it and silently drop every span. These stay above the groups, in
  // the order they were written, and carry no label.
  const sideEffects: string[] = [];

  for (const node of imports) {
    const specifier = (node.moduleSpecifier as ts.StringLiteral).text;
    const label = labelFor(specifier);
    const leading = (ts.getLeadingCommentRanges(text, node.pos) ?? [])
      .filter((range) => !hoisted.has(range.pos))
      .map((range) => text.slice(range.pos, range.end))
      .filter((comment) => !isGroupHeader(comment));
    const statement = text.slice(node.getStart(source), node.end);
    const entry = {
      // Sort on where the import comes from, then on what it brings in. Sorting the raw
      // statement instead would order `import type {A}` after `import {B}` purely because
      // the word "type" sits between them, which is not an order anyone reads for.
      key: `${specifier} ${firstBindingOf(node)}`,
      text: [...leading, statement].join('\n'),
    };

    if (node.importClause === undefined) {
      sideEffects.push(entry.text);
      continue;
    }

    groups.set(label, [...(groups.get(label) ?? []), entry]);
  }

  const grouped = [...groups.keys()]
    .sort((a, b) => a.localeCompare(b, 'en'))
    .map((label) => {
      const sorted = [...(groups.get(label) ?? [])].sort((a, b) =>
        a.key.localeCompare(b.key, 'en'),
      );

      return [`// ${label}`, ...sorted.map((entry) => entry.text)].join('\n');
    })
    .join('\n\n');

  const block = [sideEffects.join('\n'), grouped].filter((part) => part.length > 0).join('\n\n');

  const start = above.length > 0 ? above[0].pos : first.getStart(source);
  const preserved = kept.map((range) => text.slice(range.pos, range.end)).join('\n');
  const prefix = preserved.length > 0 ? `${preserved}\n\n` : '';

  return { start, end: imports[imports.length - 1].end, block: `${prefix}${block}` };
}

/**
 * @description Produces the fully rewritten contents of a file, leaving everything outside
 * the import block byte-for-byte unchanged.
 */
function rewrite(filePath: string, text: string): string {
  const source = ts.createSourceFile(filePath, text, ts.ScriptTarget.ES2022, true);
  const result = buildImportBlock(source, text);

  if (result === null) {
    return text;
  }

  const head = text.slice(0, result.start).replace(/\s+$/, '');
  const separator = head.length > 0 ? '\n\n' : '';

  return `${head}${separator}${result.block}${text.slice(result.end)}`;
}

/**
 * @description Entry point. Rewrites every file passed on the command line, or reports which
 * files would change when `--check` is supplied so CI can fail without touching the tree.
 */
function main(): void {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const explicit = args.filter((arg) => !arg.startsWith('--'));
  // Called with no paths — as `bun run format:imports` does — it sweeps the whole tree.
  // lint-staged passes the staged paths instead, so only touched files are checked there.
  const files =
    explicit.length > 0 ? explicit : [...globSync('src/**/*.ts'), ...globSync('test/**/*.ts')];
  const offenders: string[] = [];

  for (const file of files) {
    const absolute = resolve(file);
    const original = readFileSync(absolute, 'utf8');
    const updated = rewrite(absolute, original);

    if (original === updated) {
      continue;
    }

    if (checkOnly) {
      offenders.push(relative(process.cwd(), absolute));
      continue;
    }

    writeFileSync(absolute, updated);
  }

  if (offenders.length > 0) {
    process.stderr.write(
      `Import groups are not sorted in ${offenders.length} file(s):\n${offenders
        .map((file) => `  ${file}`)
        .join('\n')}\nRun \`bun run format:imports\` to fix.\n`,
    );
    process.exit(1);
  }
}

main();

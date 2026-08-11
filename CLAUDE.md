# CLAUDE.md

Repository guidance for Claude Code and other coding agents.

`AGENT_RULES.md` is one page of non-negotiable rules and outranks this file on conflict.
`AGENTS.md` is the same material condensed for Codex and other non-Claude agents.

## Toolchain and commands

This project uses bun, never npm/npx. Always use `bun run <script>`; bare `bun test` and
`bun build` invoke Bun's own runner/bundler instead of package scripts.

Node must be 24 (`.nvmrc` pins 24.11.0; engines are `>=24 <25`). Node 26 removes
`SlowBuffer` and breaks a transitive dependency below `passport-jwt`. TypeScript must
stay on 6.x: the TypeScript 7 preview removes the compiler API used by `@nestjs/cli`, so
`nest build` and `nest start` fail.

```bash
# Development and build
bun run dev:up
bun run migration:run
bun run start:dev
bun run build
bun run start:prod

# Unit, E2E, coverage, and mutation
bun run test
bun run test:cov
bun run coverage:ratchet -- --check
bun run test:e2e
bun run test:mutation:dry
bun run test:mutation

# Static and supply-chain gates
bun run lint:check          # import groups, code conventions, then ESLint
bun run format:imports      # rewrites import blocks; the fix for a lint:check sort failure
bun run lint:conventions    # the convention checker on its own
bunx tsc --noEmit
bunx tsc --noEmit -p tsconfig.tools.json
bun run architecture:check
bun run audit:ci
bun run sbom
bun run sbom:validate
bun run sdk:build

# Database and scaffolding
bun run migration:show
bun run migration:generate ./src/database/postgres/migrations/DescribeChange
bun run migration:revert
bun run seed:run
bun run generate:module products
```

The TypeORM CLI must run through `bun node_modules/typeorm/cli.js`, which the package
scripts already wrap. Do not replace it with `bunx typeorm`.

## Bootstrap invariants

`src/common/bootstrap/configure-app.ts` is the single source for the `/api` prefix, URI
versioning (default `v1`), global interceptors, and `ValidationPipe`. Both `main.ts` and
E2E bootstrap call `configureApp(app, AppModule)`. Never add a global behavior only in
`main.ts`; doing so makes E2E test an application that is not the one deployed.

Do not add `incremental: true` to a tsconfig. With Nest's `deleteOutDir`, a stale build
info file can skip emit after `dist/` is deleted and still exit zero. Remember that
`tsconfig.build.json` replaces its parent's `exclude` array rather than extending it.

## Architecture

The codebase is organized as shared infrastructure, configuration, persistence, and
feature modules:

```text
AppModule
├── configurations: app, cache, database, health, JWT, logger, mail, metrics, queue, Redis
├── database: TypeORM provider, migrations, and seeders
└── modules: authentication, users, mail, maintenance
```

dependency-cruiser enforces these boundaries:

- Controllers cannot import repositories, TypeORM, or `src/database`.
- One feature module may import another only from its public `index.ts` barrel.
- Circular and unresolvable dependencies fail CI.

Keep private class members underscore-prefixed. Generate modules with
`bun run generate:module <name>` and preserve the feature-oriented layout. The generator emits
the `constants/`, `interfaces/`, and `index.ts` barrel layout with grouped imports and
`@description` blocks already in place, so a new module satisfies the conventions below from
its first commit.

## Code conventions

**These are gated, not advisory.** `bun run lint:check` fails the build on any violation, and
so does CI. Do not work around the checkers — fix the code.

Four rules, enforced by `scripts/check-conventions.ts` and `scripts/sort-imports.ts`.

**1. Every declaration carries a JSDoc `@description`.** Classes, interfaces, type aliases,
functions, methods, and module-scope constants. A bare `/** ... */` is not enough — the tag
must be there.

```typescript
/**
 * @description Loads a user by email together with their password hash, so the login flow
 * can verify the credentials. This is the only method that hands out a password.
 *
 * @param email The email address submitted at login, in whatever case it arrived.
 */
public async findForAuthenticationByEmail(email: string): Promise<LoginIdentity | null> {}
```

Write for someone who does not know this codebase and may not know TypeScript well. Say what
the thing is _for_ and, where it matters, why it works the way it does — a description that
only restates the method name is worse than none, because it looks like documentation while
carrying no information. Constructors are exempt; their class already describes them.

**2. Imports are grouped under comment headers, sorted A–Z.** Groups sort by their label;
imports within a group sort by module path, then by the first name imported. Exactly one
blank line between groups, none inside one.

```typescript
// Constants
import { APP_ROLES } from '../../../common/constants/role.constant';

// Interfaces
import type { UserIdentity } from '../interfaces/users.interface';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
```

Never hand-maintain this. Run `bun run format:imports` — it is deterministic and idempotent.
Labels come from fixed tables in `scripts/sort-imports.ts`; extend those tables rather than
inventing a label inline. (`import/order` cannot express this convention, which is why it
stays off — see the script header.)

**Side-effect-only imports are pinned above every group**, in the order they were written.
`import './instrumentation'` has to run before anything pulls in `@nestjs/core`, `typeorm`, or
`pg`, because OpenTelemetry can only patch a library it loads first; sorting it into a labelled
group by its path would put `./app.module` ahead of it and silently drop every span. The same
protection covers `import 'dotenv/config'` and `import 'reflect-metadata'`.

**3. Class methods run private-first, then public, each group alphabetical.** A helper is
declared above the method that calls it, so a file reads top to bottom without jumping ahead.

Note the tension with route registration: Express matches the first pattern that fits, so a
static route declared after a sibling `:param` route is unreachable. When alphabetical ordering
would cause that, split the controller and order the `controllers` array in the module —
static-path controllers first, the parameter-path controller last.

**4. Constants and types live in their own files.** Files under `controllers/`, `filters/`,
`guards/`, `interceptors/`, `processors/`, `repositories/`, `services/`, `stores/`, and
`strategies/` hold business logic and nothing else:

| Declared at module scope    | Goes to                               |
| --------------------------- | ------------------------------------- |
| `const` holding a value     | `constants/<domain>.constant.ts`      |
| `const` holding a function  | becomes a private method on the class |
| `type`, `interface`, `enum` | `interfaces/<domain>.interface.ts`    |

Declarations **inside** a function or method body stay exactly where they are — those are
genuinely local, and moving them costs the reader locality for nothing.

Exempt, because declaring values is the whole job of the file: `app-env.validation.ts`,
`postgres-data-source.ts`, `instrumentation.ts`.

### The ratchet

`RATCHETED_PATHS` in `scripts/check-conventions.ts` lists the folders currently gated. In this
starter kit it covers all of `src`, so the kit ships fully converted and a project forked from
it inherits a green gate rather than a cleanup backlog.

The list only ever grows. If a fork narrows it to stage a conversion, that narrowing happens
once, at the fork, and every domain is added back as it is converted. **Never remove an entry
to make a build pass.** Code outside the list is not exempt — it is not converted yet.

## Configuration and local services

Configuration is namespaced below `src/configurations/` and validated at startup.
`.env.example` is the canonical inventory. `JWT_SECRET` and `METRICS_API_KEY` are required
high-entropy values; the metrics key must be at least 32 bytes.

Compose reads `.env`; bun also reads `.env.local` and lets it override `.env`. A stale
`.env.local` can point the app at a different host port than Compose publishes. Bun also
expands `$` in quoted values, so a literal dollar sign must be escaped:

```dotenv
DATABASE_PASSWORD="IT24680@\$^*)"
```

Read values back with `bun -e 'console.log(process.env.X)'` when diagnosing configuration.
`bun run dev:up` starts PostgreSQL 17, cache Redis, no-eviction queue Redis, Mailpit, and
Jaeger. The app itself remains on the host for watch mode.

## Persistence invariants

- TypeORM uses PostgreSQL and explicit migrations; keep `DATABASE_SYNCHRONIZE=false`.
- `AppBaseEntity` uses UUIDs, native `timestamptz` audit columns, and
  `@DeleteDateColumn`. Do not restore lifecycle hooks for timestamps: repository update
  and raw SQL paths bypass them.
- Audit column names are camelCase. Raw SQL must quote them, for example
  `users."deletedAt"`.
- TypeORM hides soft-deleted rows automatically. Queries that need them must opt into
  `.withDeleted()` or `withDeleted: true`.
- Runtime and CLI data-source entity/naming configuration is duplicated deliberately;
  removing it causes empty or endlessly repeating generated migrations.

See `docs/adr/` before revisiting TypeORM, bun, toolchain pins, audit-column naming, or
native timestamp/soft-delete decisions.

## Authentication and responses

Local Passport validates bcrypt credentials. JWT Passport validates bearer tokens and
issuer; access tokens are short-lived, while rotated refresh tokens provide long
sessions and are revoked on logout. Password input is 8–72 bytes; the upper bound is
bcrypt's effective limit. Login intentionally accepts existing credentials without
re-applying registration policy.

Responses are wrapped by `CustomBaseResponseInterceptor` into the shared envelope.
Global validation transforms values and strips unknown input. Use schema DTO validation
at every boundary and `@Exclude()` for fields that must not serialize.

## Observability and generated contracts

Pino logs include request/correlation IDs and, when a span is active, OTel `traceId` and
`spanId`. Request IDs are attached to the active span. The `/api/v1/metrics` endpoint is
protected by a custom Passport strategy whose digest comparison uses
`crypto.timingSafeEqual`; never replace it with `===`. Pino must continue redacting
`req.headers.x-api-key`.

`bun run sdk:build` boots the real `AppModule`, applies `configureApp`, emits OpenAPI,
runs Spectral with warnings as failures, generates the Hey API client, and type-checks
the result. It needs the same PostgreSQL and Redis services as an application boot.

## Quality and security

Jest runs through SWC and does not type-check. The normal TypeScript pass excludes test
and tool files, so both `bunx tsc --noEmit` and `bunx tsc --noEmit -p tsconfig.tools.json`
are required.

Coverage is ratcheted through `coverage-baseline.json`; CI uses `--check` and never
rewrites it. Add tests instead of lowering the baseline. E2E uses testcontainers with a
real PostgreSQL and two Redis containers, `maxWorkers: 1`. Stryker mutation testing is
nightly because it is intentionally too expensive for every pull request.

The audit gate rejects untriaged high/critical advisories plus expired or stale
allowlist entries. The SBOM generator reads `bun.lock` and its CycloneDX 1.6 output is
schema-validated. Never hardcode secrets or weaken `eslint.config.mjs` to make code pass.

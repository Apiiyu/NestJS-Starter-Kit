# NestJS Starter Kit

[![CI](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/ci.yml/badge.svg)](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/ci.yml)
[![Security](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/security.yml/badge.svg)](https://github.com/Apiiyu/NestJS-Starter-Kit/actions/workflows/security.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/Apiiyu/NestJS-Starter-Kit/badge)](https://securityscorecards.dev/viewer/?uri=github.com/Apiiyu/NestJS-Starter-Kit)

A production-oriented NestJS starter with PostgreSQL, TypeORM, JWT authentication,
refresh-token rotation, Redis-backed caching and queues, mail delivery, structured logs,
OpenTelemetry traces, Prometheus metrics, and CI security guardrails.

## What is included

- NestJS 11 on Node 24 and TypeScript 6, installed and scripted with bun.
- PostgreSQL 17 with explicit TypeORM migrations, native audit timestamps, and soft delete.
- Local and JWT Passport strategies, refresh-token rotation/revocation, role checks, and
  a bcrypt password policy capped at 72 bytes.
- Separate Redis instances for cache (`allkeys-lru`) and BullMQ (`noeviction`).
- Pino request logs correlated with request IDs and active OpenTelemetry trace/span IDs.
- Jaeger for local OTLP traces and an API-key-protected Prometheus scrape endpoint.
- Swagger/OpenAPI, Spectral contract linting, and a generated, type-checked TypeScript SDK.
- Unit, integration, container-backed E2E, coverage-ratchet, architecture, audit, SBOM,
  CodeQL, gitleaks, mutation, and Docker build gates.

The application uses URI versioning and a global prefix. Business endpoints are under
`/api/v1`; health probes stay version-neutral under `/api/health`. Swagger UI is served
at `/docs`.

## Requirements

- Node `>=24 <25` (`.nvmrc` pins `24.11.0`)
- bun `>=1.2` (`packageManager` pins `1.3.12`)
- Docker Desktop or another Docker-compatible daemon for backing services and E2E tests

Node 26 is intentionally unsupported: it removes `SlowBuffer`, which is still used by a
transitive dependency below `passport-jwt`. TypeScript must stay on 6.x because the
TypeScript 7 preview removes the programmatic compiler API required by `@nestjs/cli`.

## Quick start

```bash
git clone https://github.com/Apiiyu/NestJS-Starter-Kit.git
cd NestJS-Starter-Kit
cp .env.example .env
bun install --frozen-lockfile
```

Set `JWT_SECRET` and `METRICS_API_KEY` in `.env` to independent high-entropy values of at
least 32 bytes, then start the local dependencies and apply the schema:

```bash
bun run dev:up
bun run migration:run
bun run seed:run
bun run start:dev
```

`bun run dev:up` starts PostgreSQL, cache Redis, queue Redis, Mailpit, and Jaeger. The app
runs on the host in watch mode. Mailpit is available at `http://localhost:8025` and the
Jaeger UI at `http://localhost:16686` with the example ports.

```bash
bun run dev:logs    # follow dependency logs
bun run dev:down    # stop services and retain PostgreSQL data
bun run dev:reset   # stop services and DELETE local volumes
```

For a fully containerized development stack, run `docker compose up`; the app container
uses `http://jaeger:4318` for OTLP instead of the host-side `localhost` address.

### Environment file traps

Compose reads `.env`, while bun also reads `.env.local` and lets it override `.env`. A
stale `.env.local` can therefore make the app connect to different ports than Compose
published. Read suspicious values back with `bun -e 'console.log(process.env.X)'`.

Bun expands `$` inside environment values. Escape it when a literal secret contains a
dollar sign so bun and Compose receive the same value:

```dotenv
DATABASE_PASSWORD="IT24680@\$^*)"
```

If local ports are already occupied, change `DATABASE_PORT`, `REDIS_PORT`, and
`QUEUE_REDIS_PORT` in `.env`; the host app and Compose use those same variables.

## API and observability

| Surface                    | Purpose                                  |
| -------------------------- | ---------------------------------------- |
| `/docs`                    | Swagger UI                               |
| `/api/health`              | Readiness alias                          |
| `/api/health/ready`        | PostgreSQL readiness                     |
| `/api/health/live`         | Process liveness                         |
| `/api/v1/authentication/*` | Registration and token lifecycle         |
| `/api/v1/users/*`          | Authenticated user administration        |
| `/api/v1/metrics`          | Prometheus metrics; requires `x-api-key` |
| `http://localhost:16686`   | Local Jaeger UI                          |

The metrics credential is compared through `crypto.timingSafeEqual`; it is never logged
because Pino redacts `req.headers.x-api-key`. Set `OTEL_ENABLED=true` to export traces.
When a span is active, Pino logs include its `traceId` and `spanId`, while request and
correlation IDs are also attached as span attributes.

## Common commands

Always use `bun run <script>`. Bare `bun test` and `bun build` invoke Bun's own test runner
and bundler, not the package scripts.

```bash
# Development and build
bun run start:dev
bun run build
bun run start:prod
bun run generate:module products

# Database — TypeORM CLI is wrapped by the scripts
bun run migration:show
bun run migration:run
bun run migration:generate ./src/database/postgres/migrations/DescribeChange
bun run migration:revert
bun run seed:run

# Verification
bun run lint:check
bunx tsc --noEmit
bunx tsc --noEmit -p tsconfig.tools.json
bun run architecture:check
bun run test:cov
bun run coverage:ratchet -- --check
bun run test:e2e
bun run build
bun run audit:ci
bun run sbom && bun run sbom:validate

# Generated contract and expensive scheduled testing
bun run sdk:build
bun run test:mutation:dry
bun run test:mutation
```

The TypeORM CLI intentionally runs through `bun node_modules/typeorm/cli.js`; `bunx
typeorm` does not load this project's TypeScript data source correctly.

## Guardrails

| Guardrail          | What it prevents                                                      |
| ------------------ | --------------------------------------------------------------------- |
| dependency-cruiser | Controller-to-persistence access, hidden cross-module imports, cycles |
| Coverage ratchet   | A merge that lowers the committed coverage floor                      |
| Testcontainers E2E | Testing an app topology different from production bootstrap           |
| Stryker nightly    | Tests that execute code without detecting meaningful behavior changes |
| Audit allowlist    | Untriaged high/critical advisories and stale/expired exceptions       |
| CycloneDX 1.6 SBOM | Shipping without a schema-valid dependency inventory                  |
| Spectral + Hey API | Drifting OpenAPI contracts or an SDK that no longer type-checks       |
| release-please     | Hand-written versions, changelogs, and GitHub release notes           |

The committed coverage floor is branches 77.72%, functions 93.20%, lines 94.80%, and
statements 94.71%. `coverage:ratchet -- --check` never rewrites that baseline in CI;
improve tests instead of lowering it. Mutation testing covers `src/common` and
`src/modules` nightly rather than adding its runtime to every pull request.

Feature modules may consume another feature only through its public `index.ts` barrel.
Controllers cannot import TypeORM, repositories, or `src/database`. These boundaries are
enforced by `.dependency-cruiser.cjs`, not just documented as a convention.

## Why the additional tooling exists

- `dependency-cruiser` makes DDD layer boundaries executable.
- `@stryker-mutator/*` measures whether unit tests reject behavior changes.
- `prom-client` exposes standard Node and process metrics; `passport-custom` integrates
  the scrape API key with the existing Nest Passport guard pattern.
- `@stoplight/spectral-cli` validates the OpenAPI contract before artifact publication.
- `@hey-api/openapi-ts` generates the SDK and is exact-pinned because its 0.x releases
  may contain breaking changes.

Architecture and persistence trade-offs are recorded in [docs/adr](docs/adr/README.md).
Accepted ADRs cover TypeORM/PostgreSQL, bun, Node/TypeScript pins, camelCase audit columns,
and the native timestamp/soft-delete decisions.

## Project layout

```text
src/
├── common/          shared bootstrap, guards, interceptors, strategies, and telemetry
├── configurations/ app, cache, database, health, JWT, logger, mail, metrics, queue, Redis
├── database/        TypeORM provider, migrations, and seeders
└── modules/         authentication, users, mail, and maintenance feature modules
scripts/             coverage, audit, SBOM, and OpenAPI build tools
test/                testcontainers-backed E2E suites and global lifecycle
docs/adr/            architecture decision records
```

Do not add `incremental: true` to the TypeScript configuration. Combined with Nest's
`deleteOutDir`, it can produce a partial build that exits successfully.

## Contributing and security

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request. Report security
issues privately as described in [SECURITY.md](SECURITY.md), never in a public issue.
This project is available under the [MIT License](LICENSE).

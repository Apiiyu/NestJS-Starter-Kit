# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**This project uses bun, not npm.** Always `bun run <script>` — a bare `bun test`
or `bun build` invokes bun's own runner and bundler instead of the package script.

```bash
# Development
bun run start:dev       # Start with watch mode (also runs lint check)
bun run start:debug     # Debug mode with watch

# Build & Production
bun run build           # Compile TypeScript
bun run start:prod      # Run compiled output

# Testing
bun run test            # Unit tests
bun run test:watch      # Unit tests in watch mode
bun run test:cov        # Coverage report (enforces the threshold gate)
bun run test:e2e        # E2E tests (./test/jest-e2e.json config)

# Code Quality
bun run lint:fix        # ESLint with auto-fix
bun run format          # Prettier on src/ and test/

# Database
bun run seed:run        # Run database seeders (TypeORM-extension)

# Scaffolding
bun run generate:module <name>   # Generate full DDD module skeleton
```

Requires Node 24 (`.nvmrc` pins 24.11.0) and bun >= 1.2. Node 26 breaks a
transitive dependency of passport-jwt (`buffer-equal-constant-time` uses the
removed `SlowBuffer`), so the engines range is deliberately `>=24 <25`.

## Architecture

**Domain-Driven Design** with layered configuration and feature modules.

### Module Hierarchy

```
AppModule
├── Config layer: AppConfigurationModule, DatabasePostgresConfigModule, JwtConfigurationModule
├── DB layer: PostgresDatabaseProviderModule (TypeORM DataSource)
└── Feature layer:
    ├── AuthenticationModule  ← imports UsersModule
    └── UsersModule
```

### Configuration Pattern

Each configuration lives in `src/configurations/<domain>/`. Config modules use `registerAs()` for namespaced env binding and inject via `registerAsync()`. Three config namespaces: `app`, `database.postgres`, `jwt`.

Environment variables are loaded via `.env` (see `.env.example`). Required vars: `APP_*`, `DATABASE_*`, `JWT_*`.

### Database Pattern

- **TypeORM + PostgreSQL**, Data Mapper pattern
- `AppBaseEntity` (`src/common/entities/app-base-entity.ts`): UUID PK, Unix-ms timestamps, createdBy/updatedBy/deletedBy audit fields, soft delete via `deletedAt`
- DataSource config at `src/database/postgres/postgres-data-source.ts`
- Seeders in `src/database/seeders/`

### Authentication Pattern

- **Local strategy**: bcrypt password validation → issues JWT
- **JWT strategy**: Bearer token from Authorization header, validates issuer
- Guards: `JwtAuthGuard`, `LocalAuthGuard` in `src/common/guards/`
- Password hashing uses `SALT_OR_ROUND` constant from bcrypt helpers

### API Response Pattern

All responses are wrapped via `CustomBaseResponseInterceptor` → `BaseResponseDto<T>` with `statusCode`, `message`, `data`. Global validation uses `ValidationPipe` with `transform: true` and `whitelist: true`. Use `@Exclude()` on entity fields for serialization control.

### Generating a New Module

```bash
npm run generate:module products
```

Creates: Controller, Service, Entity, DTOs, Interfaces — following the established `src/modules/<name>/` structure. Always use this generator to maintain consistency.

### Code Style Conventions

- Private class properties use underscore prefix: `_propertyName`
- Keep variable/function/import names alphabetically ordered within their block
- Before adding a dependency, evaluate: update frequency, community size, open issues, bundle impact

### Tooling Notes

- Tests transform through `@swc/jest`, which does **not** type-check. Type safety
  comes from the separate `bunx tsc --noEmit` CI job — run it before assuming a
  green test run means the types are sound.
- TypeScript stays on 6.x. TS 7.0 ships only the `tsc` binary and drops the
  programmatic compiler API that `@nestjs/cli` needs, so `nest build` and
  `nest start` both fail on it. The codebase itself compiles clean under 7.0.2;
  revisit when the API returns in 7.1.
- Do not add `incremental: true` to `tsconfig.json`. Combined with nest-cli's
  `deleteOutDir`, tsc reads a stale `.tsbuildinfo`, skips emit after nest wiped
  `dist/`, and produces a partial build that still exits 0.
- The audit columns on `AppBaseEntity` declare explicit camelCase names, so raw
  SQL must quote them (`users."deletedAt"`), not assume snake_case.

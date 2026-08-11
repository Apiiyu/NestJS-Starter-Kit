# AGENTS.md — NestJS Starter Kit

> For Codex and any AI agent working in this repository.
> Toolchain detail lives in `CLAUDE.md`. Non-negotiable rules live in `AGENT_RULES.md`.

## Context

This is a starter kit, not an application. Everything in it is meant to be forked and grown
into a real service, so the bar is different from a product repo: a shortcut taken here is
inherited by every project that starts from it. The kit ships with the gates already green —
`lint:check`, both TypeScript passes, `architecture:check`, `audit:ci`, and the coverage
ratchet — and that state is the product.

What is already here: authentication (Passport local + JWT with rotated refresh tokens), users
with a named invalidatable cache, mail via BullMQ, a maintenance scheduler, health and metrics
endpoints, Pino logging correlated with OpenTelemetry traces, TypeORM on PostgreSQL with
explicit migrations, and a generated OpenAPI client.

## ⛔ Read this first

**`AGENT_RULES.md` — one page, mandatory, and it outranks every other document on conflict.**

It comes down to one sentence: _no task is marked `[x]` without the command output pasted
underneath it._

Reading order: `AGENT_RULES.md` → `CLAUDE.md` → the module you are changing.

## Six rules that are not negotiable

1. **`bun` / `bunx`, never `npm` / `npx`.** And always `bun run <script>` — bare `bun test` and
   `bun build` invoke Bun's own runner and bundler instead of the package scripts.
2. **Node 24, TypeScript 6.x.** Node 26 removes `SlowBuffer` and breaks a transitive dependency
   below `passport-jwt`; the TypeScript 7 preview removes the compiler API `@nestjs/cli` uses.
3. **Global behaviour goes in `src/common/bootstrap/configure-app.ts`, never only in
   `main.ts`.** Both `main.ts` and the E2E bootstrap call `configureApp`. Adding a pipe or
   interceptor to `main.ts` alone makes E2E test an application that is not the one deployed.
4. **`DATABASE_SYNCHRONIZE=false` permanently.** Schema changes are explicit migrations.
5. **Versioning rises per route, never per API.** Duplicating a controller to serve a new
   version is how a `v1`/`legacy` folder of byte-identical controllers gets born.
6. **Never weaken a gate to make code pass.** See `AGENT_RULES.md` Rule 6.

## Code conventions — enforced by machine, not by encouragement

`bun run lint:check` **fails** if any of these is broken, and CI fails with it. Do not work
around the checkers; fix the code. Enforced by `scripts/check-conventions.ts` and
`scripts/sort-imports.ts`.

**1. Every declaration carries a JSDoc `@description`** — class, interface, type, function,
method, and module-scope constant. A bare `/** ... */` without the tag does not count.

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
the thing is _for_, and where it matters, _why_ it works the way it does. A description that
only restates the method name is worse than none — it looks like documentation while carrying
no information. Constructors are exempt.

**2. Imports are grouped under comment headers, sorted A–Z.** Groups sort by label; imports
inside a group sort by module path, then by the first name imported. Exactly one blank line
between groups, none inside one.

```typescript
// Constants
import { APP_ROLES } from '../../../common/constants/role.constant';

// Interfaces
import type { UserIdentity } from '../interfaces/users.interface';

// NestJS Libraries
import { Injectable } from '@nestjs/common';
```

**Never hand-maintain this** — run `bun run format:imports`. It is deterministic and
idempotent. Labels come from the tables in `scripts/sort-imports.ts`; extend those tables
rather than inventing a label inline.

Side-effect-only imports (`import './instrumentation'`, `import 'dotenv/config'`) are pinned
above every group in their original order, because their position is semantics rather than
presentation — OpenTelemetry can only patch a library it loads first.

**3. Class methods run private-first, then public, each group alphabetical.** A helper sits
above the method that calls it, so a file reads top to bottom without jumping ahead.

**4. Constants and types get their own files.** Files under `controllers/`, `filters/`,
`guards/`, `interceptors/`, `processors/`, `repositories/`, `services/`, `stores/`, and
`strategies/` hold business logic and nothing else:

| Declared at module scope    | Goes to                               |
| --------------------------- | ------------------------------------- |
| `const` holding a value     | `constants/<domain>.constant.ts`      |
| `const` holding a function  | becomes a private method on the class |
| `type`, `interface`, `enum` | `interfaces/<domain>.interface.ts`    |

Declarations **inside** a function or method body stay where they are — those are genuinely
local. Exempt because declaring values is the whole job of the file:
`app-env.validation.ts`, `postgres-data-source.ts`, `instrumentation.ts`.

Full reasoning for each rule: `CLAUDE.md` → "Code conventions".

## Architecture boundaries

dependency-cruiser fails CI on any of these:

- Controllers cannot import repositories, TypeORM, or `src/database`.
- One feature module may import another only through its public `index.ts` barrel.
- Circular and unresolvable dependencies are errors.

Private class members are underscore-prefixed. Scaffold modules with
`bun run generate:module <name>` — it emits the `constants/`, `interfaces/`, and `index.ts`
layout with grouped imports and `@description` placeholders already in place, so a new module
is convention-clean from its first commit.

## Entity pattern

```typescript
@Entity({ name: 'products' })
export class ProductEntity extends AppBaseEntity {
  @Column({ name: 'sku' })
  sku: string;
}
```

`AppBaseEntity` gives UUID primary keys, native `timestamptz` audit columns in camelCase, and
`@DeleteDateColumn` soft deletes. Audit column names are camelCase, so raw SQL must quote
them: `users."deletedAt"`. TypeORM hides soft-deleted rows automatically — queries that need
them must opt in with `.withDeleted()`.

Do not restore lifecycle hooks for timestamps; repository `update` and raw SQL bypass them.

## API contract

- `/api/v1/*` — prefix and URI versioning already wired in `configure-app.ts`
- Response envelope comes from `CustomBaseResponseInterceptor`
- Global `ValidationPipe` transforms values and strips unknown input
- Pagination on every list endpoint
- Sorting accepts only columns from an explicit allowlist
- `@Exclude()` on anything that must not serialise — a cached plain object has no prototype,
  so it must be rehydrated before it reaches the interceptor

## Commands

```bash
bun run dev:up && bun run migration:run && bun run start:dev
bun run test && bun run test:cov && bun run test:e2e
bun run lint:check && bunx tsc --noEmit && bunx tsc --noEmit -p tsconfig.tools.json
bun run architecture:check && bun run audit:ci
bun run format:imports && bun run lint:conventions
bun run generate:module <name>
```

The TypeORM CLI runs through `bun node_modules/typeorm/cli.js`, which the package scripts
already wrap. Do not replace it with `bunx typeorm`.

## Definition of Done

- Tests pass, with the count stated
- `lint:check`, `tsc --noEmit` (×2 configs), `architecture:check`, `audit:ci` all clean
- Coverage did not drop (`bun run coverage:ratchet -- --check`)
- New endpoints appear in the generated OpenAPI and pass `openapi:lint`
- Every new declaration has a real `@description`
- Conventional commit message (`commitlint` runs on `commit-msg`)

## Prohibited

- `npm` / `npx` · `synchronize: true` · `--no-verify`
- Lowering `coverage-baseline.json`, relaxing `eslint.config.mjs`, narrowing
  `.dependency-cruiser.cjs`, or removing a glob from `RATCHETED_PATHS`
- Hardcoded secrets
- Global behaviour added only to `main.ts`
- Claiming done without a command that was actually run

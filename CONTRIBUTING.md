# Contributing

Thanks for taking the time. This is a starter kit, so the bar for a change is
whether it makes every project generated from it better — not just yours.

## Setup

Node 24 (`.nvmrc` pins it) and bun >= 1.2. Node 26 breaks a transitive dependency
of `passport-jwt`, which is why `engines.node` is `>=24 <25`.

```bash
bun install
cp .env.example .env    # then fill JWT_SECRET and METRICS_API_KEY
bun run dev:up
bun run migration:run
bun run seed:run
bun run start:dev
```

## Before you open a PR

Run the same core gates as CI before pushing:

```bash
bun run lint:check
bunx tsc --noEmit
bunx tsc --noEmit -p tsconfig.tools.json
bun run architecture:check
bun run test:cov && bun run coverage:ratchet -- --check
bun run test:e2e
bun run build
bun run audit:ci
bun run sbom && bun run sbom:validate
```

Note that `bun run test` does **not** type-check — `@swc/jest` strips types without
checking them. The main `tsc` pass excludes specs and scripts, which is why the tools
configuration is a separate required pass. Contract changes must also pass
`bun run sdk:build`; it needs the local backing services.

## Commits

Conventional Commits, enforced by commitlint via a `commit-msg` hook. Run
`bun run commitizen` if you want the interactive prompt.

```
feat(users): add pagination to the list endpoint
fix(auth): reject a token whose issuer does not match
```

The type drives release automation, so `feat` and `fix` are not decorative.

## Conventions

These are load-bearing — the code is written assuming them.

- Private class members take an underscore prefix: `_usersService`.
- Keep variables, functions, and imports alphabetically ordered within their block.
- Generate new modules with `bun run generate:module <name>` rather than by hand.
- Import another feature module through its public `index.ts` only.
- Keep controllers out of persistence and TypeORM; dependency-cruiser enforces this.
- Before adding a dependency, weigh update frequency, community size, open issues,
  and bundle impact. Say why in the PR description.

## Database changes

Schema changes ship as migrations, never as `synchronize: true`.

```bash
bun run migration:generate ./src/database/postgres/migrations/DescriptiveName
bun run migration:run
bun run migration:revert   # prove the down path works before you push
```

A migration that has never been reverted is a migration you do not know works.

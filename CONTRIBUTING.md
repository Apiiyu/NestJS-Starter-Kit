# Contributing

Thanks for taking the time. This is a starter kit, so the bar for a change is
whether it makes every project generated from it better — not just yours.

## Setup

Node 24 (`.nvmrc` pins it) and bun >= 1.2. Node 26 breaks a transitive dependency
of `passport-jwt`, which is why `engines.node` is `>=24 <25`.

```bash
bun install
cp .env.example .env    # then fill JWT_SECRET and the DATABASE_* values
bun run migration:run
bun run seed:run
bun run start:dev
```

## Before you open a PR

All four must pass. CI runs the same commands, so a green local run is a green CI run.

```bash
bun run lint:check
bunx tsc --noEmit
bun run test:cov
bun run build
```

Note that `bun run test` does **not** type-check — `@swc/jest` strips types without
checking them. `bunx tsc --noEmit` is the only thing that does, and it excludes spec
files, so a broken test fixture will only show up when the test actually runs.

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

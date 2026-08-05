# ADR 0002: Use bun as the package toolchain

- Status: Accepted
- Date: 2026-08-05
- Deciders: Project maintainers

## Context

Mixing package managers produces competing lockfiles and different dependency trees. This
repository already uses `bun.lock`, Bun-aware scripts, and GitHub Actions that install with
`--frozen-lockfile`. A single command convention is needed so local, Docker, and CI runs
resolve the same graph.

## Decision

Use bun for dependency installation and package-script execution. Commit `bun.lock`, pin the
expected Bun version in `packageManager`, and require `bun install --frozen-lockfile` in CI.

Invoke package scripts as `bun run <script>`. A bare `bun test` or `bun build` is not
equivalent: those names invoke Bun's built-in test runner or bundler instead of the scripts
defined by this project. Use `bunx` only for package binaries that are intentionally not
wrapped by a script. The TypeORM CLI is the explicit exception and runs through
`bun node_modules/typeorm/cli.js` because its loader must resolve this project's TypeScript
data source correctly.

## Consequences

### Positive

- Local and CI dependency resolution share one lockfile and one package manager.
- Installation and script startup remain fast.
- `--frozen-lockfile` exposes uncommitted dependency drift.

### Negative

- Contributors must install bun in addition to the supported Node runtime.
- Documentation and automation must avoid npm/npx examples even when upstream docs use them.
- Bun's `.env.local` precedence and `$` expansion require care when sharing values with
  Docker Compose.

## Alternatives considered

- **npm** — Universally available with Node, but adopting it would discard the established
  lockfile and CI baseline.
- **pnpm** — Strong workspace support, but this is a single-package repository and a second
  package manager would add no needed capability.

## References

- `package.json`
- `bun.lock`
- `.github/workflows/ci.yml`

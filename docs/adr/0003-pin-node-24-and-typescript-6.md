# ADR 0003: Pin Node 24 and TypeScript 6

- Status: Accepted
- Date: 2026-08-05
- Deciders: Project maintainers

## Context

The starter kit depends on two compatibility boundaries. TypeScript 7.0 ships the `tsc`
binary but removes the programmatic compiler API used by Nest CLI 11, so `nest build` and
`nest start` fail. Node 26 removes `SlowBuffer`; the `buffer-equal-constant-time` package
below `passport-jwt` still references it and breaks authentication startup.

## Decision

Pin the supported runtime to Node 24 (`>=24 <25`, with `.nvmrc` as the local patch pin) and
keep TypeScript on the 6.x release line until the Nest compiler integration supports a later
major. CI and development tooling must use those constraints, not the machine's ambient
Node version.

Do not enable TypeScript incremental compilation. Nest CLI deletes `dist/` before building;
a surviving `.tsbuildinfo` can then make TypeScript skip emission and report success with a
partial output tree.

## Consequences

### Positive

- Nest build/start and passport JWT verification run on a tested toolchain.
- `engines`, `.nvmrc`, Docker, and CI communicate the same support boundary.
- Upgrades become explicit compatibility work rather than accidental lockfile drift.

### Negative

- Developers with Node 26 must select Node 24 before running project binaries.
- TypeScript 7 language and performance improvements remain unavailable until Nest support
  catches up.
- Renovate must not merge Node or TypeScript major updates automatically.

## Alternatives considered

- **TypeScript 7 now** — Type-checking alone works, but the production Nest compiler path
  does not.
- **Node 26 now** — Requires replacing or patching the transitive JWT comparison package
  before the runtime can be supported safely.
- **Incremental builds** — Faster in theory, but known to produce incomplete `dist/` output
  with Nest's `deleteOutDir` lifecycle.

## References

- `.nvmrc`
- `package.json` (`engines`, `typescript`)
- `tsconfig.json`
- `renovate.json`
